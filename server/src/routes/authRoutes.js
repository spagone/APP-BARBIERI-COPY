const express = require('express');
const router = express.Router();
const {
  register,
  login,
  socialLogin,
  refreshSession,
  logout,
  getCurrentUser,
  updateAvatar,
  forgotPassword,
  resetPassword,
  requestEmailVerification,
  verifyEmail,
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
  listUsers,
} = require('../controllers/authController');
const { requireAuth, requireAdminApiKey } = require('../middleware/authMiddleware');
const { authWriteLimiter, passwordResetLimiter } = require('../middleware/rateLimitMiddleware');

router.post('/register', authWriteLimiter, register);
router.post('/login', authWriteLimiter, login);
router.post('/social-login', authWriteLimiter, socialLogin);
router.post('/refresh', authWriteLimiter, refreshSession);
router.post('/logout', authWriteLimiter, logout);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPassword);
router.get('/me', requireAuth, getCurrentUser);
router.patch('/me/avatar', requireAuth, updateAvatar);
router.post('/request-email-verification', requireAuth, authWriteLimiter, requestEmailVerification);
router.post('/verify-email', authWriteLimiter, verifyEmail);
router.post('/booking-confirmation-email', requireAuth, authWriteLimiter, sendBookingConfirmationEmail);
router.post('/booking-cancellation-email', requireAuth, authWriteLimiter, sendBookingCancellationEmail);
router.get('/users', requireAdminApiKey, listUsers);

module.exports = router;
