import { getSupabaseClient } from '../config/supabase.js';
import { errors, jwtVerify } from 'jose';
import { env } from '../config/env.js';
import { adminTokenConfig } from '../services/admin-auth.service.js';

function unauthorized(res, message) {
  res.status(401).json({
    error: {
      code: 'UNAUTHORIZED',
      message,
    },
  });
}

export async function requireAdmin(req, res, next) {
  const authorization = req.get('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    unauthorized(res, 'Token autentikasi diperlukan.');
    return;
  }

  if (match[1].startsWith('ec-admin.')) {
    if (!env.ADMIN_USERNAME || !env.ADMIN_JWT_SECRET) {
      unauthorized(res, 'Token autentikasi tidak valid atau kedaluwarsa.');
      return;
    }

    try {
      const { payload } = await jwtVerify(
        match[1].slice('ec-admin.'.length),
        new TextEncoder().encode(env.ADMIN_JWT_SECRET),
        { issuer: adminTokenConfig.issuer, audience: adminTokenConfig.audience, algorithms: ['HS256'] },
      );
      if (payload.role !== 'admin' || payload.username !== env.ADMIN_USERNAME || payload.sub !== env.ADMIN_USERNAME) {
        unauthorized(res, 'Token autentikasi tidak valid atau kedaluwarsa.');
        return;
      }

      req.user = { username: env.ADMIN_USERNAME, app_metadata: { role: 'admin' } };
      next();
      return;
    } catch (error) {
      if (error instanceof errors.JOSEError) {
        unauthorized(res, 'Token autentikasi tidak valid atau kedaluwarsa.');
        return;
      }
      next(error);
      return;
    }
  }

  const { data, error } = await getSupabaseClient().auth.getUser(match[1]);

  if (error) {
    if (error.status === 401 || error.status === 403) {
      unauthorized(res, 'Token autentikasi tidak valid atau kedaluwarsa.');
      return;
    }

    next(error);
    return;
  }

  if (data.user?.app_metadata?.role !== 'admin') {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Akses hanya tersedia untuk admin.',
      },
    });
    return;
  }

  req.user = data.user;
  next();
}
