const rateLimit = require('express-rate-limit');

const jsonMessage = (message, code = 'RATE_LIMITED') => ({
  code,
  message,
});

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

const readPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const createLimiter = ({ windowMs, max, message, code }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: jsonMessage(message, code),
  });

exports.authWriteLimiter = createLimiter({
  windowMs: readPositiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: readPositiveInt(process.env.AUTH_RATE_LIMIT_MAX, isProduction ? 20 : 400),
  code: 'AUTH_RATE_LIMIT',
  message: 'Troppi tentativi su autenticazione. Riprova tra qualche minuto.',
});

exports.passwordResetLimiter = createLimiter({
  windowMs: readPositiveInt(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000),
  max: readPositiveInt(process.env.PASSWORD_RESET_RATE_LIMIT_MAX, isProduction ? 5 : 40),
  code: 'PASSWORD_RESET_RATE_LIMIT',
  message: 'Troppi tentativi di reset password. Riprova tra un\'ora.',
});
