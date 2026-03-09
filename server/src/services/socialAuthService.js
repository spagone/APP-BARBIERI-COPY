const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const GOOGLE_TOKEN_INFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const FACEBOOK_GRAPH_BASE_URL = 'https://graph.facebook.com/v19.0';

class SocialAuthError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'SocialAuthError';
    this.code = code;
    this.status = status;
  }
}

let cachedAppleJwks = {
  keys: [],
  expiresAtMs: 0,
};

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();
const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const parseBooleanLike = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
};

const parseProvider = (providerRaw) => {
  const provider = normalizeText(providerRaw).toLowerCase();
  if (!['google', 'apple', 'facebook'].includes(provider)) {
    throw new SocialAuthError('INVALID_SOCIAL_PROVIDER', 'Provider social non supportato.');
  }
  return provider;
};

const fetchJson = async (url, options = {}, genericErrorMessage = 'Provider social non raggiungibile.') => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const fallbackMessage =
        payload && typeof payload.error_description === 'string'
          ? payload.error_description
          : payload && typeof payload.error?.message === 'string'
            ? payload.error.message
            : genericErrorMessage;
      throw new SocialAuthError('SOCIAL_TOKEN_INVALID', fallbackMessage, 401);
    }

    return payload;
  } catch (error) {
    if (error instanceof SocialAuthError) {
      throw error;
    }

    throw new SocialAuthError('SOCIAL_PROVIDER_UNREACHABLE', genericErrorMessage, 502);
  } finally {
    clearTimeout(timeout);
  }
};

const requireToken = (value, label) => {
  const token = normalizeText(value);
  if (!token) {
    throw new SocialAuthError('VALIDATION_ERROR', `${label} mancante.`);
  }
  return token;
};

const ensureGoogleAudience = (audience) => {
  if (!audience) {
    throw new SocialAuthError('SOCIAL_TOKEN_INVALID', 'Google token senza audience.', 401);
  }

  if (env.googleOauthClientIds.length === 0) return;

  if (!env.googleOauthClientIds.includes(audience)) {
    throw new SocialAuthError('SOCIAL_TOKEN_INVALID', 'Google token non valido per questa app.', 401);
  }
};

const verifyGoogleIdentity = async ({ idToken }) => {
  const token = requireToken(idToken, 'Google idToken');
  const url = `${GOOGLE_TOKEN_INFO_URL}?id_token=${encodeURIComponent(token)}`;
  const payload = await fetchJson(url, undefined, 'Verifica Google non disponibile.');

  const email = normalizeEmail(payload?.email);
  const sub = normalizeText(payload?.sub);
  const audience = normalizeText(payload?.aud);
  const name = normalizeText(payload?.name || payload?.given_name);
  const picture = normalizeText(payload?.picture);
  const emailVerified = parseBooleanLike(payload?.email_verified);

  ensureGoogleAudience(audience);

  if (!sub || !email) {
    throw new SocialAuthError('SOCIAL_TOKEN_INVALID', 'Google token non contiene dati utente validi.', 401);
  }

  return {
    provider: 'google',
    providerUserId: sub,
    email,
    name,
    avatarUri: picture || undefined,
    emailVerified,
  };
};

const getAppleJwks = async () => {
  const now = Date.now();
  if (cachedAppleJwks.keys.length > 0 && cachedAppleJwks.expiresAtMs > now) {
    return cachedAppleJwks.keys;
  }

  const payload = await fetchJson(APPLE_JWKS_URL, undefined, 'Verifica Apple non disponibile.');
  const keys = Array.isArray(payload?.keys) ? payload.keys : [];

  if (keys.length === 0) {
    throw new SocialAuthError('SOCIAL_PROVIDER_UNREACHABLE', 'Apple keyset non disponibile.', 502);
  }

  cachedAppleJwks = {
    keys,
    expiresAtMs: now + 10 * 60 * 1000,
  };

  return keys;
};

const ensureAppleAudience = (verifyOptions) => {
  if (env.appleClientIds.length > 0) {
    verifyOptions.audience = env.appleClientIds.length === 1 ? env.appleClientIds[0] : env.appleClientIds;
  }
};

const verifyAppleIdentity = async ({ identityToken, nameHint }) => {
  const token = requireToken(identityToken, 'Apple identityToken');
  const decoded = jwt.decode(token, { complete: true });

  if (!decoded || typeof decoded !== 'object') {
    throw new SocialAuthError('SOCIAL_TOKEN_INVALID', 'Apple token non valido.', 401);
  }

  const keyId = normalizeText(decoded?.header?.kid);
  if (!keyId) {
    throw new SocialAuthError('SOCIAL_TOKEN_INVALID', 'Apple token senza key id.', 401);
  }

  const jwks = await getAppleJwks();
  const jwk = jwks.find((item) => item && item.kid === keyId && item.kty === 'RSA');
  if (!jwk) {
    throw new SocialAuthError('SOCIAL_TOKEN_INVALID', 'Apple key non trovata per questo token.', 401);
  }

  const publicKey = crypto.createPublicKey({
    key: jwk,
    format: 'jwk',
  });

  const verifyOptions = {
    algorithms: ['RS256'],
    issuer: 'https://appleid.apple.com',
  };

  ensureAppleAudience(verifyOptions);

  let verifiedPayload;
  try {
    verifiedPayload = jwt.verify(token, publicKey, verifyOptions);
  } catch {
    throw new SocialAuthError('SOCIAL_TOKEN_INVALID', 'Apple token non verificabile.', 401);
  }

  const sub = normalizeText(verifiedPayload?.sub);
  const email = normalizeEmail(verifiedPayload?.email);
  const emailVerified = parseBooleanLike(verifiedPayload?.email_verified);
  const hintedName = normalizeText(nameHint);

  if (!sub) {
    throw new SocialAuthError('SOCIAL_TOKEN_INVALID', 'Apple token senza utente.', 401);
  }

  return {
    provider: 'apple',
    providerUserId: sub,
    email: email || '',
    name: hintedName,
    emailVerified,
  };
};

const verifyFacebookAppBinding = async (accessToken) => {
  if (!env.facebookAppId || !env.facebookAppSecret) return;

  const appAccessToken = `${env.facebookAppId}|${env.facebookAppSecret}`;
  const url = `${FACEBOOK_GRAPH_BASE_URL}/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appAccessToken)}`;
  const payload = await fetchJson(url, undefined, 'Verifica Facebook non disponibile.');
  const data = payload?.data;

  if (!data?.is_valid) {
    throw new SocialAuthError('SOCIAL_TOKEN_INVALID', 'Facebook token non valido.', 401);
  }

  const tokenAppId = normalizeText(data.app_id);
  if (tokenAppId && tokenAppId !== env.facebookAppId) {
    throw new SocialAuthError('SOCIAL_TOKEN_INVALID', 'Facebook token emesso per altra app.', 401);
  }
};

const verifyFacebookIdentity = async ({ accessToken }) => {
  const token = requireToken(accessToken, 'Facebook accessToken');
  await verifyFacebookAppBinding(token);

  const profileUrl =
    `${FACEBOOK_GRAPH_BASE_URL}/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(token)}`;
  const payload = await fetchJson(profileUrl, undefined, 'Verifica Facebook non disponibile.');

  const id = normalizeText(payload?.id);
  const email = normalizeEmail(payload?.email);
  const name = normalizeText(payload?.name);
  const avatarUri = normalizeText(payload?.picture?.data?.url);

  if (!id) {
    throw new SocialAuthError('SOCIAL_TOKEN_INVALID', 'Facebook token senza profilo valido.', 401);
  }

  if (!email) {
    throw new SocialAuthError(
      'SOCIAL_EMAIL_REQUIRED',
      'Facebook non ha restituito la tua email. Consenti permesso email e riprova.',
      400
    );
  }

  return {
    provider: 'facebook',
    providerUserId: id,
    email,
    name,
    avatarUri: avatarUri || undefined,
    emailVerified: true,
  };
};

const verifySocialIdentity = async ({ provider, idToken, identityToken, accessToken, nameHint }) => {
  const normalizedProvider = parseProvider(provider);

  if (normalizedProvider === 'google') {
    return verifyGoogleIdentity({ idToken });
  }

  if (normalizedProvider === 'apple') {
    return verifyAppleIdentity({
      identityToken: identityToken || idToken,
      nameHint,
    });
  }

  return verifyFacebookIdentity({ accessToken });
};

module.exports = {
  verifySocialIdentity,
  SocialAuthError,
};
