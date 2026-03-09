const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

const BCRYPT_SALT_ROUNDS = 12;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;
const USER_SELECT_FIELDS =
  '_id name email role avatarUri shop lastLoginAt loginCount emailVerified isBlocked blockedAt blockedReason createdAt updatedAt';

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

const sanitizeUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  avatarUri: user.avatarUri,
  emailVerified: Boolean(user.emailVerified),
  isBlocked: Boolean(user.isBlocked),
  blockedAt: user.blockedAt,
  blockedReason: user.blockedReason,
  shop: user.role === 'barber' && user.shop ? user.shop : undefined,
  lastLoginAt: user.lastLoginAt,
  loginCount: user.loginCount || 0,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const normalizePagination = (query) => {
  const pageRaw = Number(query.page || 1);
  const limitRaw = Number(query.limit || 20);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 100) : 20;
  return { page, limit, skip: (page - 1) * limit };
};

const isStrongPassword = (password) =>
  typeof password === 'string' &&
  password.length >= PASSWORD_MIN_LENGTH &&
  PASSWORD_COMPLEXITY_REGEX.test(password);

const generateStrongTempPassword = () => {
  const raw = crypto.randomBytes(9).toString('base64url');
  return `Mb!${raw}9a`;
};

const writeAuditLog = async (req, { action, targetUserId, metadata }) => {
  try {
    await AuditLog.create({
      actorUserId: req.auth.currentUser._id,
      actorEmail: req.auth.currentUser.email,
      action,
      targetUserId,
      metadata,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });
  } catch {
    // Best effort logging; do not block core operations.
  }
};

exports.getOverview = async (_req, res) => {
  try {
    const [totalUsers, totalClients, totalBarbers, totalAdmins, blockedUsers, verifiedUsers] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'client' }),
      User.countDocuments({ role: 'barber' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ isBlocked: true }),
      User.countDocuments({ emailVerified: true }),
    ]);

    return res.status(200).json({
      stats: {
        totalUsers,
        totalClients,
        totalBarbers,
        totalAdmins,
        blockedUsers,
        verifiedUsers,
      },
    });
  } catch {
    return res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Errore server.',
    });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const { search = '', role, status } = req.query;
    const { page, limit, skip } = normalizePagination(req.query);

    const filter = {};

    if (typeof search === 'string' && search.trim().length > 0) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ name: new RegExp(safeSearch, 'i') }, { email: new RegExp(safeSearch, 'i') }];
    }

    if (role === 'client' || role === 'barber' || role === 'admin') {
      filter.role = role;
    }

    if (status === 'blocked') {
      filter.isBlocked = true;
    } else if (status === 'active') {
      filter.isBlocked = false;
    }

    const [items, total] = await Promise.all([
      User.find(filter).select(USER_SELECT_FIELDS).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      users: items.map(sanitizeUser),
    });
  } catch {
    return res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Errore server.',
    });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const isBlocked = Boolean(req.body?.isBlocked);
    const blockedReasonRaw = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'Utente non trovato.',
      });
    }

    if (String(targetUser._id) === String(req.auth.currentUser._id) && isBlocked) {
      return res.status(400).json({
        code: 'INVALID_OPERATION',
        message: 'Non puoi bloccare il tuo stesso account admin.',
      });
    }

    targetUser.isBlocked = isBlocked;
    targetUser.blockedAt = isBlocked ? new Date() : undefined;
    targetUser.blockedReason = isBlocked && blockedReasonRaw ? blockedReasonRaw : undefined;

    if (isBlocked) {
      targetUser.refreshTokenHash = undefined;
      targetUser.refreshTokenExpiresAt = undefined;
    }

    await targetUser.save();

    await writeAuditLog(req, {
      action: isBlocked ? 'user.block' : 'user.unblock',
      targetUserId: targetUser._id,
      metadata: { reason: targetUser.blockedReason },
    });

    return res.status(200).json({
      message: isBlocked ? 'Utente bloccato.' : 'Utente sbloccato.',
      user: sanitizeUser(targetUser),
    });
  } catch {
    return res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Errore server.',
    });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const nextRole = req.body?.role;

    if (!['client', 'barber', 'admin'].includes(nextRole)) {
      return res.status(400).json({
        code: 'INVALID_ROLE',
        message: 'Ruolo non valido.',
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'Utente non trovato.',
      });
    }

    if (String(targetUser._id) === String(req.auth.currentUser._id) && nextRole !== 'admin') {
      return res.status(400).json({
        code: 'INVALID_OPERATION',
        message: 'Non puoi rimuovere il tuo ruolo admin.',
      });
    }

    const previousRole = targetUser.role;
    targetUser.role = nextRole;

    if (nextRole !== 'barber') {
      targetUser.shop = undefined;
    }

    await targetUser.save();

    await writeAuditLog(req, {
      action: 'user.role.update',
      targetUserId: targetUser._id,
      metadata: { previousRole, nextRole },
    });

    return res.status(200).json({
      message: 'Ruolo utente aggiornato.',
      user: sanitizeUser(targetUser),
    });
  } catch {
    return res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Errore server.',
    });
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'Utente non trovato.',
      });
    }

    let nextPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : '';
    let generated = false;

    if (!nextPassword) {
      nextPassword = generateStrongTempPassword();
      generated = true;
    }

    if (!isStrongPassword(nextPassword)) {
      return res.status(400).json({
        code: 'WEAK_PASSWORD',
        message: 'Password debole. Minimo 8 caratteri con lettere e numeri.',
      });
    }

    targetUser.password = await bcrypt.hash(nextPassword, 12);
    targetUser.passwordResetTokenHash = undefined;
    targetUser.passwordResetExpiresAt = undefined;
    targetUser.refreshTokenHash = undefined;
    targetUser.refreshTokenExpiresAt = undefined;
    await targetUser.save();

    await writeAuditLog(req, {
      action: 'user.password.reset',
      targetUserId: targetUser._id,
      metadata: { generated },
    });

    return res.status(200).json({
      message: 'Password utente resettata.',
      temporaryPassword: nextPassword,
    });
  } catch {
    return res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Errore server.',
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;

    if (String(targetUserId) === String(req.auth.currentUser._id)) {
      return res.status(400).json({
        code: 'INVALID_OPERATION',
        message: 'Non puoi eliminare il tuo stesso account admin.',
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'Utente non trovato.',
      });
    }

    await User.deleteOne({ _id: targetUser._id });

    await writeAuditLog(req, {
      action: 'user.delete',
      targetUserId: targetUser._id,
      metadata: { email: normalizeEmail(targetUser.email), role: targetUser.role },
    });

    return res.status(200).json({
      message: 'Utente eliminato con successo.',
    });
  } catch {
    return res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Errore server.',
    });
  }
};

exports.listAuditLogs = async (req, res) => {
  try {
    const { page, limit, skip } = normalizePagination(req.query);
    const action = typeof req.query.action === 'string' ? req.query.action.trim() : '';
    const actorEmail = typeof req.query.actorEmail === 'string' ? req.query.actorEmail.trim().toLowerCase() : '';

    const filter = {};
    if (action) {
      filter.action = action;
    }
    if (actorEmail) {
      filter.actorEmail = actorEmail;
    }

    const [items, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      logs: items.map((entry) => ({
        id: String(entry._id),
        actorUserId: String(entry.actorUserId),
        actorEmail: entry.actorEmail,
        action: entry.action,
        targetUserId: entry.targetUserId ? String(entry.targetUserId) : null,
        metadata: entry.metadata,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        createdAt: entry.createdAt,
      })),
    });
  } catch {
    return res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Errore server.',
    });
  }
};

