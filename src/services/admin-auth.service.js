import { createHash, timingSafeEqual } from 'node:crypto';
import { SignJWT } from 'jose';
import { env } from '../config/env.js';
import { httpError } from '../utils/http-error.js';

const issuer = 'ec-backend';
const audience = 'ec-admin';
const tokenLifetimeSeconds = 15 * 60;

function constantTimeEqual(left, right) {
  const leftHash = createHash('sha256').update(left).digest();
  const rightHash = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export async function loginAdmin(username, password) {
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD || !env.ADMIN_JWT_SECRET) {
    throw httpError(503, 'SERVICE_NOT_CONFIGURED', 'Login admin belum dikonfigurasi.');
  }

  const usernameMatches = constantTimeEqual(username, env.ADMIN_USERNAME);
  const passwordMatches = constantTimeEqual(password, env.ADMIN_PASSWORD);
  if (!usernameMatches || !passwordMatches) {
    throw httpError(401, 'INVALID_CREDENTIALS', 'Username atau password salah.');
  }

  const secret = new TextEncoder().encode(env.ADMIN_JWT_SECRET);
  const accessToken = await new SignJWT({ role: 'admin', username: env.ADMIN_USERNAME })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(env.ADMIN_USERNAME)
    .setIssuedAt()
    .setExpirationTime(`${tokenLifetimeSeconds}s`)
    .sign(secret);

  return {
    access_token: `ec-admin.${accessToken}`,
    token_type: 'Bearer',
    expires_in: tokenLifetimeSeconds,
  };
}

export const adminTokenConfig = { issuer, audience };
