const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { env } = require('../config/env');

const normalizeEmail = (value = '') => String(value).trim().toLowerCase();

const ensureAdminUser = async () => {
  const email = normalizeEmail(env.adminBootstrapEmail);
  const password = String(env.adminBootstrapPassword || '');
  const name = String(env.adminBootstrapName || 'MyBarber Admin').trim();

  if (!email || !password) {
    return { created: false, reason: 'bootstrap_not_configured' };
  }

  const existingAdmin = await User.findOne({ email });
  if (existingAdmin) {
    if (existingAdmin.role !== 'admin') {
      existingAdmin.role = 'admin';
      existingAdmin.isBlocked = false;
      await existingAdmin.save();
    }
    return { created: false, reason: 'already_exists' };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    name: name || 'MyBarber Admin',
    email,
    password: passwordHash,
    role: 'admin',
    emailVerified: true,
    isBlocked: false,
  });

  return { created: true, reason: 'created' };
};

module.exports = { ensureAdminUser };

