const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const User = require('../models/User');

const DEV_FALLBACK_JWT_SECRET = 'dev-only-insecure-secret';
const getJwtSecret = () => env.jwtSecret || DEV_FALLBACK_JWT_SECRET;

const extractBearerToken = (authorizationHeader = '') => {
  const [scheme, token] = authorizationHeader.split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token.trim();
};

exports.requireAuth = (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({
      code: 'AUTH_REQUIRED',
      message: 'Token di accesso mancante.',
    });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    req.auth = {
      userId: payload.sub,
      role: payload.role,
      email: payload.email,
    };
    return next();
  } catch (error) {
    return res.status(401).json({
      code: 'INVALID_TOKEN',
      message: 'Token non valido o scaduto.',
    });
  }
};

exports.requireAdminApiKey = (req, res, next) => {
  const configuredAdminKey = env.adminApiKey;
  if (!configuredAdminKey) {
    return res.status(503).json({
      code: 'ADMIN_KEY_NOT_CONFIGURED',
      message: 'ADMIN_API_KEY non configurata sul server.',
    });
  }

  const providedKey = req.headers['x-admin-key'];
  if (typeof providedKey !== 'string' || providedKey !== configuredAdminKey) {
    return res.status(401).json({
      code: 'INVALID_ADMIN_KEY',
      message: 'Chiave admin non valida.',
    });
  }

  return next();
};

exports.requireRole =
  (...allowedRoles) =>
  async (req, res, next) => {
    if (!req.auth?.userId) {
      return res.status(401).json({
        code: 'AUTH_REQUIRED',
        message: 'Autenticazione richiesta.',
      });
    }

    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
      return res.status(500).json({
        code: 'ROLE_CONFIG_ERROR',
        message: 'Configurazione ruoli non valida.',
      });
    }

    try {
      const currentUser = await User.findById(req.auth.userId);

      if (!currentUser) {
        return res.status(401).json({
          code: 'USER_NOT_FOUND',
          message: 'Utente non trovato.',
        });
      }

      if (currentUser.isBlocked) {
        return res.status(403).json({
          code: 'ACCOUNT_BLOCKED',
          message: 'Account bloccato.',
        });
      }

      if (!allowedRoles.includes(currentUser.role)) {
        return res.status(403).json({
          code: 'FORBIDDEN',
          message: 'Permessi insufficienti.',
        });
      }

      req.auth.currentUser = currentUser;
      return next();
    } catch {
      return res.status(500).json({
        code: 'SERVER_ERROR',
        message: 'Errore server.',
      });
    }
  };
