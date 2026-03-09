const parseCsv = (value = '') =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const nodeEnv = process.env.NODE_ENV || 'development';

const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT || 5000),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  jwtRefreshExpiresDays: Number(process.env.JWT_REFRESH_EXPIRES_DAYS || 30),
  corsOrigins: parseCsv(process.env.CORS_ORIGINS || ''),
  adminApiKey: process.env.ADMIN_API_KEY || '',
  trustProxy: process.env.TRUST_PROXY === 'true',
  adminBootstrapEmail: process.env.ADMIN_BOOTSTRAP_EMAIL || '',
  adminBootstrapPassword: process.env.ADMIN_BOOTSTRAP_PASSWORD || '',
  adminBootstrapName: process.env.ADMIN_BOOTSTRAP_NAME || 'MyBarber Admin',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || '',
  smtpReplyTo: process.env.SMTP_REPLY_TO || '',
  googleOauthClientIds: parseCsv(process.env.GOOGLE_OAUTH_CLIENT_IDS || ''),
  appleClientIds: parseCsv(process.env.APPLE_CLIENT_IDS || ''),
  facebookAppId: process.env.FACEBOOK_APP_ID || '',
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET || '',
};

const validateEnv = () => {
  const errors = [];

  if (!env.databaseUrl) {
    errors.push('DATABASE_URL mancante');
  }

  if (env.databaseUrl && !/^postgres(ql)?:\/\//i.test(env.databaseUrl)) {
    errors.push('DATABASE_URL non valida: usa una URL PostgreSQL (postgresql://...)');
  }

  if (!env.jwtSecret && env.isProd) {
    errors.push('JWT_SECRET mancante in produzione');
  }

  if (env.jwtSecret && env.jwtSecret.length < 32 && env.isProd) {
    errors.push('JWT_SECRET troppo corta (min 32 caratteri in produzione)');
  }

  if (Number.isNaN(env.port) || env.port <= 0) {
    errors.push('PORT non valida');
  }

  if (Number.isNaN(env.jwtRefreshExpiresDays) || env.jwtRefreshExpiresDays < 1) {
    errors.push('JWT_REFRESH_EXPIRES_DAYS non valida');
  }

  if ((env.adminBootstrapEmail && !env.adminBootstrapPassword) || (!env.adminBootstrapEmail && env.adminBootstrapPassword)) {
    errors.push('ADMIN_BOOTSTRAP_EMAIL e ADMIN_BOOTSTRAP_PASSWORD devono essere impostate insieme');
  }

  const hasSmtpConfig =
    Boolean(env.smtpHost) || Boolean(process.env.SMTP_PORT) || Boolean(env.smtpUser) || Boolean(env.smtpPass) || Boolean(env.smtpFrom);

  if (hasSmtpConfig) {
    if (!env.smtpHost) {
      errors.push('SMTP_HOST mancante');
    }

    if (Number.isNaN(env.smtpPort) || env.smtpPort <= 0) {
      errors.push('SMTP_PORT non valida');
    }

    if (!env.smtpFrom) {
      errors.push('SMTP_FROM mancante');
    }

    if ((env.smtpUser && !env.smtpPass) || (!env.smtpUser && env.smtpPass)) {
      errors.push('SMTP_USER e SMTP_PASS devono essere impostate insieme');
    }
  }

  if (env.facebookAppSecret && !env.facebookAppId) {
    errors.push('FACEBOOK_APP_ID mancante (richiesta quando FACEBOOK_APP_SECRET e impostata)');
  }

  if (errors.length > 0) {
    throw new Error(`Configurazione ambiente non valida: ${errors.join(' | ')}`);
  }
};

module.exports = {
  env,
  validateEnv,
};
