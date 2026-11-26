import { env } from '../config/env.js';

export function errorHandler(error, _req, res, _next) {
  if (res.headersSent) return;

  if (error.status >= 500 || !error.status) {
    console.error(error);
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  const message = status >= 500 && env.NODE_ENV === 'production'
    ? 'Terjadi kesalahan pada server.'
    : error.message;

  res.status(status).json({
    error: {
      code: error.code ?? 'INTERNAL_SERVER_ERROR',
      message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
}
