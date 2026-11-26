import { prisma } from '../config/prisma.js';

export function getHealth(_req, res) {
  res.json({
    data: {
      status: 'ok',
      service: 'ec-api',
      timestamp: new Date().toISOString(),
    },
  });
}

export async function getReadiness(_req, res) {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error('Database readiness check failed:', error);
    res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database tidak tersedia.',
      },
    });
    return;
  }

  res.json({
    data: {
      status: 'ready',
      database: 'connected',
    },
  });
}
