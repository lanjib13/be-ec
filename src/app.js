import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/error-handler.js';
import { notFound } from './middlewares/not-found.js';
import { docsRouter } from './routes/docs.routes.js';
import { apiRouter } from './routes/index.js';

export function createApp() {
  const app = express();
  const allowedOrigins = env.CLIENT_URL.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (env.NODE_ENV !== 'production') {
    allowedOrigins.push(`http://localhost:${env.PORT}`, `http://127.0.0.1:${env.PORT}`);
  }

  app.disable('x-powered-by');
  if (env.NODE_ENV !== 'production') {
    app.use('/api-docs', helmet({ contentSecurityPolicy: false }), docsRouter);
  }
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      const error = new Error('Origin is not allowed by CORS');
      error.status = 403;
      error.code = 'CORS_ORIGIN_DENIED';
      callback(error);
    },
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', apiRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
