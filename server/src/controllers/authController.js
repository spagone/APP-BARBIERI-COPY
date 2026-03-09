const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { env } = require('../config/env');
const {
  sendWelcomeEmail,
  sendPasswordResetEmail: sendPasswordResetEmailService,
  sendBookingConfirmationEmail: sendBookingConfirmationEmailService,
  sendBookingCancellationEmail: sendBookingCancellationEmailService,
} = require('../services/emailService');
const { verifySocialIdentity, SocialAuthError } = require('../services/socialAuthService');

const DEV_FALLBACK_JWT_SECRET = 'dev-only-insecure-secret';
const BCRYPT_SALT_ROUNDS = 12;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;
const SOCIAL_PROVIDER_FIELD = {
  google: 'googleSub',
  apple: 'appleSub',
  facebook: 'facebookId',
};

const getJwtSecret = () => env.jwtSecret || DEV_FALLBACK_JWT_SECRET;
const now = () => Date.now();
const toDateFromNow = (ms) => new Date(now() + ms);

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();
const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');
const hashOpaqueToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const createOpaqueToken = () => crypto.randomBytes(48).toString('hex');
const parseTimestampToDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const isStrongPassword = (password) =>
  typeof password === 'string' &&
  password.length >= PASSWORD_MIN_LENGTH &&
  PASSWORD_COMPLEXITY_REGEX.test(password);

const normalizeShopPayload = (shop) => {
  if (!shop || typeof shop !== 'object') return null;

  const shopName = typeof shop.shopName === 'string' ? shop.shopName.trim() : '';
  const shopAddress = typeof shop.shopAddress === 'string' ? shop.shopAddress.trim() : '';
  const shopCity = typeof shop.shopCity === 'string' ? shop.shopCity.trim() : '';

  if (!shopName || !shopAddress || !shopCity) return null;

  return { shopName, shopAddress, shopCity };
};

const buildPublicUser = (user) => {
  const baseUser = {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUri: user.avatarUri,
    emailVerified: Boolean(user.emailVerified),
    isBlocked: Boolean(user.isBlocked),
    blockedReason: user.blockedReason,
  };

  if (user.role === 'barber' && user.shop) {
    return {
      ...baseUser,
      shop: {
        shopName: user.shop.shopName,
        shopAddress: user.shop.shopAddress,
        shopCity: user.shop.shopCity,
      },
    };
  }

  return baseUser;
};

const signAccessToken = (user) =>
  jwt.sign(
    {
      sub: String(user._id),
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: env.jwtAccessExpires }
  );

const setAndPersistRefreshToken = async (user) => {
  const refreshToken = createOpaqueToken();
  user.refreshTokenHash = hashOpaqueToken(refreshToken);
  user.refreshTokenExpiresAt = toDateFromNow(env.jwtRefreshExpiresDays * 24 * 60 * 60 * 1000);
  await user.save();
  return refreshToken;
};

const clearRefreshToken = async (user) => {
  user.refreshTokenHash = undefined;
  user.refreshTokenExpiresAt = undefined;
  await user.save();
};

const buildAuthPayload = async (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = await setAndPersistRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    token: accessToken, // backward compatibility with current mobile store
    user: buildPublicUser(user),
  };
};

const findUserByValidRefreshToken = async (refreshTokenRaw) => {
  const refreshTokenHash = hashOpaqueToken(refreshTokenRaw);
  const user = await User.findOne({ refreshTokenHash });

  if (!user) return null;

  if (user.isBlocked) {
    await clearRefreshToken(user);
    return null;
  }

  if (!user.refreshTokenExpiresAt || user.refreshTokenExpiresAt.getTime() < now()) {
    await clearRefreshToken(user);
    return null;
  }

  return user;
};

const buildGenericServerError = (res) =>
  res.status(500).json({
    code: 'SERVER_ERROR',
    message: 'Errore server.',
  });

const maybeExposeDevToken = (fieldName, tokenValue) => {
  if (env.isProd) return {};
  return { [fieldName]: tokenValue };
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, shop } = req.body;
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = normalizeEmail(email);
    const plainPassword = typeof password === 'string' ? password : '';

    if (!trimmedName || !normalizedEmail || !plainPassword || !role) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Dati mancanti.',
      });
    }

    if (!['client', 'barber'].includes(role)) {
      return res.status(400).json({
        code: 'INVALID_ROLE',
        message: 'Ruolo non valido.',
      });
    }

    if (!isStrongPassword(plainPassword)) {
      return res.status(400).json({
        code: 'WEAK_PASSWORD',
        message: 'Password debole. Minimo 8 caratteri con lettere e numeri.',
      });
    }

    const normalizedShop = role === 'barber' ? normalizeShopPayload(shop) : undefined;
    if (role === 'barber' && !normalizedShop) {
      return res.status(400).json({
        code: 'INVALID_SHOP_DATA',
        message: 'Per i barbieri servono nome negozio, indirizzo e citta.',
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email gia registrata.',
      });
    }

    const passwordHash = await bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
    const emailVerificationToken = createOpaqueToken();

    const user = new User({
      name: trimmedName,
      email: normalizedEmail,
      password: passwordHash,
      role,
      shop: normalizedShop,
      emailVerified: false,
      emailVerificationTokenHash: hashOpaqueToken(emailVerificationToken),
      emailVerificationExpiresAt: toDateFromNow(24 * 60 * 60 * 1000),
    });

    await user.save();
    void sendWelcomeEmail({
      email: user.email,
      name: user.name,
      role: user.role,
    }).catch((error) => {
      if (!env.isTest) {
        console.error('Welcome email error:', error.message);
      }
    });

    return res.status(201).json({
      message: 'Utente registrato con successo.',
      user: buildPublicUser(user),
      verificationRequired: true,
      ...maybeExposeDevToken('emailVerificationToken', emailVerificationToken),
    });
  } catch {
    return buildGenericServerError(res);
  }
};

exports.login = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);
    const plainPassword = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!normalizedEmail || !plainPassword) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Email e password sono obbligatorie.',
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Email o password non corretti.',
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        code: 'ACCOUNT_BLOCKED',
        message: 'Account bloccato. Contatta il supporto.',
      });
    }

    let isPasswordValid = await bcrypt.compare(plainPassword, user.password);

    // Compatibility for legacy clear-text password records.
    if (!isPasswordValid && user.password === plainPassword) {
      isPasswordValid = true;
      user.password = await bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Email o password non corretti.',
      });
    }

    user.lastLoginAt = new Date();
    user.loginCount = (user.loginCount || 0) + 1;

    const payload = await buildAuthPayload(user);

    return res.status(200).json({
      message: 'Login effettuato con successo.',
      ...payload,
    });
  } catch {
    return buildGenericServerError(res);
  }
};

exports.socialLogin = async (req, res) => {
  try {
    const provider = normalizeText(req.body?.provider).toLowerCase();
    const socialIdentity = await verifySocialIdentity({
      provider,
      idToken: req.body?.idToken,
      identityToken: req.body?.identityToken,
      accessToken: req.body?.accessToken,
      nameHint: req.body?.nameHint,
    });

    const providerField = SOCIAL_PROVIDER_FIELD[socialIdentity.provider];
    if (!providerField) {
      return res.status(400).json({
        code: 'INVALID_SOCIAL_PROVIDER',
        message: 'Provider social non supportato.',
      });
    }

    let user = await User.findOne({ [providerField]: socialIdentity.providerUserId });
    const normalizedIdentityEmail = normalizeEmail(socialIdentity.email);

    if (!user && normalizedIdentityEmail) {
      user = await User.findOne({ email: normalizedIdentityEmail });
    }

    let isNewUser = false;

    if (!user) {
      if (!normalizedIdentityEmail) {
        return res.status(400).json({
          code: 'SOCIAL_EMAIL_REQUIRED',
          message: 'Il provider social non ha restituito una email valida.',
        });
      }

      const generatedPassword = createOpaqueToken();
      const passwordHash = await bcrypt.hash(generatedPassword, BCRYPT_SALT_ROUNDS);
      const socialName = normalizeText(socialIdentity.name) || 'Cliente MyBarber';

      user = new User({
        name: socialName,
        email: normalizedIdentityEmail,
        password: passwordHash,
        role: 'client',
        emailVerified: Boolean(socialIdentity.emailVerified),
        avatarUri: socialIdentity.avatarUri,
      });
      user[providerField] = socialIdentity.providerUserId;
      await user.save();

      isNewUser = true;
      void sendWelcomeEmail({
        email: user.email,
        name: user.name,
        role: user.role,
      }).catch((error) => {
        if (!env.isTest) {
          console.error('Welcome email error:', error.message);
        }
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        code: 'ACCOUNT_BLOCKED',
        message: 'Account bloccato. Contatta il supporto.',
      });
    }

    let shouldSaveUser = false;

    if (socialIdentity.providerUserId && user[providerField] !== socialIdentity.providerUserId) {
      user[providerField] = socialIdentity.providerUserId;
      shouldSaveUser = true;
    }

    if (socialIdentity.emailVerified && !user.emailVerified) {
      user.emailVerified = true;
      shouldSaveUser = true;
    }

    if ((!user.avatarUri || user.avatarUri.trim().length === 0) && socialIdentity.avatarUri) {
      user.avatarUri = socialIdentity.avatarUri;
      shouldSaveUser = true;
    }

    if ((!user.name || user.name.trim().length === 0) && normalizeText(socialIdentity.name)) {
      user.name = normalizeText(socialIdentity.name);
      shouldSaveUser = true;
    }

    user.lastLoginAt = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    shouldSaveUser = true;

    if (shouldSaveUser) {
      await user.save();
    }

    const payload = await buildAuthPayload(user);

    return res.status(200).json({
      message: isNewUser ? 'Account creato con social login.' : 'Login social effettuato con successo.',
      isNewUser,
      ...payload,
    });
  } catch (error) {
    if (error instanceof SocialAuthError) {
      return res.status(error.status || 400).json({
        code: error.code || 'SOCIAL_LOGIN_ERROR',
        message: error.message || 'Login social non riuscito.',
      });
    }

    return buildGenericServerError(res);
  }
};

exports.refreshSession = async (req, res) => {
  try {
    const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';

    if (!refreshToken) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Refresh token mancante.',
      });
    }

    const user = await findUserByValidRefreshToken(refreshToken);
    if (!user) {
      return res.status(401).json({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token non valido o scaduto.',
      });
    }

    const payload = await buildAuthPayload(user);

    return res.status(200).json({
      message: 'Sessione aggiornata.',
      ...payload,
    });
  } catch {
    return buildGenericServerError(res);
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';

    if (refreshToken) {
      const user = await User.findOne({ refreshTokenHash: hashOpaqueToken(refreshToken) });
      if (user) {
        await clearRefreshToken(user);
      }
    }

    return res.status(200).json({
      message: 'Logout completato.',
    });
  } catch {
    return buildGenericServerError(res);
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'Utente non trovato.',
      });
    }

    return res.status(200).json({
      user: buildPublicUser(user),
    });
  } catch {
    return buildGenericServerError(res);
  }
};

exports.updateAvatar = async (req, res) => {
  try {
    const avatarUriRaw = req.body?.avatarUri;
    const normalizedAvatar =
      typeof avatarUriRaw === 'string' && avatarUriRaw.trim().length > 0 ? avatarUriRaw.trim() : undefined;

    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'Utente non trovato.',
      });
    }

    user.avatarUri = normalizedAvatar;
    await user.save();

    return res.status(200).json({
      message: 'Avatar aggiornato.',
      user: buildPublicUser(user),
    });
  } catch {
    return buildGenericServerError(res);
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);

    if (!normalizedEmail) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Email obbligatoria.',
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    let resetToken;
    if (user) {
      resetToken = createOpaqueToken();
      user.passwordResetTokenHash = hashOpaqueToken(resetToken);
      user.passwordResetExpiresAt = toDateFromNow(15 * 60 * 1000);
      await user.save();

      try {
        await sendPasswordResetEmailService({
          email: user.email,
          name: user.name,
          resetToken,
          expiresInMin: 15,
        });
      } catch (error) {
        if (!env.isTest) {
          console.error('Password reset email error:', error.message);
        }
      }
    }

    return res.status(200).json({
      message: 'Se l\'email esiste, riceverai istruzioni per il reset password.',
      ...maybeExposeDevToken('passwordResetToken', resetToken),
    });
  } catch {
    return buildGenericServerError(res);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!token || !newPassword) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Token e nuova password sono obbligatori.',
      });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        code: 'WEAK_PASSWORD',
        message: 'Password debole. Minimo 8 caratteri con lettere e numeri.',
      });
    }

    const hashedToken = hashOpaqueToken(token);
    const user = await User.findOne({
      passwordResetTokenHash: hashedToken,
      passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        code: 'INVALID_RESET_TOKEN',
        message: 'Token reset non valido o scaduto.',
      });
    }

    user.password = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.refreshTokenHash = undefined;
    user.refreshTokenExpiresAt = undefined;
    await user.save();

    return res.status(200).json({
      message: 'Password aggiornata con successo.',
    });
  } catch {
    return buildGenericServerError(res);
  }
};

exports.requestEmailVerification = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'Utente non trovato.',
      });
    }

    if (user.emailVerified) {
      return res.status(200).json({
        message: 'Email gia verificata.',
      });
    }

    const emailVerificationToken = createOpaqueToken();
    user.emailVerificationTokenHash = hashOpaqueToken(emailVerificationToken);
    user.emailVerificationExpiresAt = toDateFromNow(24 * 60 * 60 * 1000);
    await user.save();

    return res.status(200).json({
      message: 'Token di verifica generato.',
      ...maybeExposeDevToken('emailVerificationToken', emailVerificationToken),
    });
  } catch {
    return buildGenericServerError(res);
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';

    if (!token) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Token verifica email mancante.',
      });
    }

    const hashedToken = hashOpaqueToken(token);
    const user = await User.findOne({
      emailVerificationTokenHash: hashedToken,
      emailVerificationExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        code: 'INVALID_EMAIL_VERIFICATION_TOKEN',
        message: 'Token verifica email non valido o scaduto.',
      });
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    return res.status(200).json({
      message: 'Email verificata con successo.',
      user: buildPublicUser(user),
    });
  } catch {
    return buildGenericServerError(res);
  }
};

exports.sendBookingConfirmationEmail = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'Utente non trovato.',
      });
    }

    const bookingId = normalizeText(req.body?.bookingId);
    const shopName = normalizeText(req.body?.shopName);
    const shopAddress = normalizeText(req.body?.shopAddress);
    const shopCity = normalizeText(req.body?.shopCity);
    const barberName = normalizeText(req.body?.barberName);
    const serviceName = normalizeText(req.body?.serviceName);
    const durationMin = Number(req.body?.durationMin);
    const price = Number(req.body?.price);
    const startAt = parseTimestampToDate(req.body?.startAt);
    const endAt = parseTimestampToDate(req.body?.endAt);

    if (!bookingId || !shopName || !barberName || !serviceName || !startAt) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Dati prenotazione incompleti.',
      });
    }

    if (!Number.isFinite(durationMin) || durationMin <= 0) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Durata prenotazione non valida.',
      });
    }

    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Prezzo prenotazione non valido.',
      });
    }

    const delivery = await sendBookingConfirmationEmailService({
      email: user.email,
      name: user.name,
      bookingId,
      shopName,
      shopAddress,
      shopCity,
      barberName,
      serviceName,
      startAt,
      endAt,
      durationMin,
      price,
    });

    if (delivery?.skipped) {
      return res.status(200).json({
        message: 'Prenotazione salvata. Email non inviata (SMTP non configurato).',
      });
    }

    return res.status(200).json({
      message: 'Email di conferma prenotazione inviata.',
    });
  } catch {
    return buildGenericServerError(res);
  }
};

exports.sendBookingCancellationEmail = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'Utente non trovato.',
      });
    }

    const bookingId = normalizeText(req.body?.bookingId);
    const shopName = normalizeText(req.body?.shopName);
    const shopAddress = normalizeText(req.body?.shopAddress);
    const shopCity = normalizeText(req.body?.shopCity);
    const barberName = normalizeText(req.body?.barberName);
    const serviceName = normalizeText(req.body?.serviceName);
    const cancelledReason = normalizeText(req.body?.cancelledReason);
    const durationMin = Number(req.body?.durationMin);
    const price = Number(req.body?.price);
    const startAt = parseTimestampToDate(req.body?.startAt);
    const endAt = parseTimestampToDate(req.body?.endAt);
    const cancelledAt = parseTimestampToDate(req.body?.cancelledAt) || new Date();

    if (!bookingId || !shopName || !barberName || !serviceName || !startAt) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Dati annullamento prenotazione incompleti.',
      });
    }

    if (!Number.isFinite(durationMin) || durationMin <= 0) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Durata prenotazione non valida.',
      });
    }

    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Prezzo prenotazione non valido.',
      });
    }

    const delivery = await sendBookingCancellationEmailService({
      email: user.email,
      name: user.name,
      bookingId,
      shopName,
      shopAddress,
      shopCity,
      barberName,
      serviceName,
      startAt,
      endAt,
      durationMin,
      price,
      cancelledReason,
      cancelledAt,
    });

    if (delivery?.skipped) {
      return res.status(200).json({
        message: 'Annullamento registrato. Email non inviata (SMTP non configurato).',
      });
    }

    return res.status(200).json({
      message: 'Email annullamento prenotazione inviata.',
    });
  } catch {
    return buildGenericServerError(res);
  }
};

exports.listUsers = async (_req, res) => {
  try {
    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });

    return res.status(200).json({
      users: users.map((user) => ({
        ...buildPublicUser(user),
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        loginCount: user.loginCount || 0,
      })),
    });
  } catch {
    return buildGenericServerError(res);
  }
};
