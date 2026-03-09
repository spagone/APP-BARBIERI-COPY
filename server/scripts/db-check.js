require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const run = async () => {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('DB OK: connessione PostgreSQL riuscita.');
  } catch (error) {
    console.error('DB ERROR: connessione fallita.');
    if (error && error.code) {
      console.error(`Prisma code: ${error.code}`);
    }
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

run();
