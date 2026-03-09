require('dotenv').config();

const { ensureAdminUser } = require('./bootstrap/ensureAdminUser');
const { createApp } = require('./app');
const { env, validateEnv } = require('./config/env');
const { setDbReady } = require('./lib/dbState');
const { prisma } = require('./lib/prisma');

const startServer = async () => {
  try {
    validateEnv();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
    return;
  }

  if (!env.jwtSecret) {
    console.warn('JWT_SECRET non impostata: in uso una chiave dev non sicura.');
  }

  const app = createApp();

  try {
    await prisma.$connect();
    setDbReady(true);
    console.log('PostgreSQL connected');

    const bootstrapResult = await ensureAdminUser();
    if (bootstrapResult.created) {
      console.log('Admin bootstrap user created.');
    }

    const server = app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} ricevuto, shutdown in corso...`);
      setDbReady(false);

      try {
        await prisma.$disconnect();
      } finally {
        server.close(() => process.exit(0));
      }
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
  } catch (err) {
    setDbReady(false);
    if (err && err.code === 'P1001') {
      console.error('Database connection error: impossibile raggiungere PostgreSQL.');
      console.error(
        'Controlla DATABASE_URL e che il DB sia online (se cloud, usa sslmode=require).'
      );
    } else {
      console.error('Database connection error:', err);
    }
    process.exit(1);
  }
};

startServer();
