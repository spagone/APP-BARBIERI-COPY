const express = require('express');
const {
  deleteUser,
  getOverview,
  listAuditLogs,
  listUsers,
  resetUserPassword,
  updateUserRole,
  updateUserStatus,
} = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { authWriteLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/overview', getOverview);
router.get('/users', listUsers);
router.patch('/users/:id/status', authWriteLimiter, updateUserStatus);
router.patch('/users/:id/role', authWriteLimiter, updateUserRole);
router.post('/users/:id/reset-password', authWriteLimiter, resetUserPassword);
router.delete('/users/:id', authWriteLimiter, deleteUser);
router.get('/audit-logs', listAuditLogs);

module.exports = router;

