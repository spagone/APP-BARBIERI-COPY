const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');

const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const { env } = require('./config/env');
const { getDbReady } = require('./lib/dbState');

const createCorsOptions = () => {
  if (env.corsOrigins.length === 0 || env.isTest) {
    return { origin: true };
  }

  const isLocalDevOrigin = (origin) => {
    if (env.isProd || !origin) return false;

    try {
      const parsed = new URL(origin);
      const isHttp = parsed.protocol === 'http:';
      const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      return isHttp && isLocalHost;
    } catch {
      return false;
    }
  };

  return {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.corsOrigins.includes(origin) || isLocalDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin non consentita da CORS'));
    },
  };
};

const createApp = () => {
  const app = express();

  app.disable('x-powered-by');

  if (env.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(cors(createCorsOptions()));
  app.use(express.json({ limit: '200kb' }));
  app.use(morgan(env.isProd ? 'combined' : 'dev'));

  app.get('/healthz', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      uptimeSec: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/readyz', (_req, res) => {
    const isDbReady = getDbReady();
    res.status(isDbReady ? 200 : 503).json({
      status: isDbReady ? 'ready' : 'not_ready',
      dbState: isDbReady ? 'connected' : 'disconnected',
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);

  app.get('/', (_req, res) => {
    res.status(200).json({
      service: 'MyBarber API',
      status: 'online',
    });
  });

  app.use((err, _req, res, _next) => {
    if (err && /origin/i.test(err.message)) {
      return res.status(403).json({
        code: 'CORS_BLOCKED',
        message: 'Richiesta bloccata da policy CORS.',
      });
    }

    return res.status(500).json({
      code: 'UNHANDLED_ERROR',
      message: 'Errore inatteso.',
    });
  });

  return app;
};

module.exports = { createApp };
