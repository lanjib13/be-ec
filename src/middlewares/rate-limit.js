import rateLimit from 'express-rate-limit';

function rateLimitResponse(_req, res) {
  res.status(429).json({
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.',
    },
  });
}

export const publicWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
});

export const recruitmentStatusLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
});

export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
});
