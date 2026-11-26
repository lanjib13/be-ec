import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

process.env.NODE_ENV ??= 'test';
process.env.ADMIN_USERNAME = 'test-admin';
process.env.ADMIN_PASSWORD = 'test-admin-password-123';
process.env.ADMIN_JWT_SECRET = 'test-admin-jwt-secret-at-least-32-characters';

process.env.DATABASE_URL ??= 'postgresql://postgres:local@127.0.0.1:5432/ec_dev';
process.env.DIRECT_URL ??= 'postgresql://postgres:local@127.0.0.1:5432/ec_dev';

const { createApp } = await import('../src/app.js');
const { prisma } = await import('../src/config/prisma.js');
const { requireAdmin } = await import('../src/middlewares/require-admin.js');
const app = createApp();
let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('health endpoint returns the API status envelope', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.status, 'ok');
  assert.equal(body.data.service, 'ec-api');
});

test('admin login issues a short-lived access token without exposing credentials', async () => {
  const response = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test-admin', password: 'test-admin-password-123' }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.token_type, 'Bearer');
  assert.equal(body.data.expires_in, 900);
  assert.match(body.data.access_token, /^ec-admin\./);
  assert.equal(JSON.stringify(body).includes('test-admin-password-123'), false);

  const req = { get: () => `Bearer ${body.data.access_token}` };
  const res = {
    statusCode: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
    },
  };
  let nextCalled = false;
  await requireAdmin(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user.app_metadata.role, 'admin');

  const invalidReq = { get: () => 'Bearer ec-admin.invalid-token' };
  let invalidStatus;
  const invalidRes = {
    status(code) {
      invalidStatus = code;
      return this;
    },
    json() {},
  };
  await requireAdmin(invalidReq, invalidRes, () => {
    throw new Error('Invalid admin token must not be accepted.');
  });
  assert.equal(invalidStatus, 401);
});

test('admin login rejects invalid credentials', async () => {
  const response = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test-admin', password: 'wrong-password' }),
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, 'INVALID_CREDENTIALS');
});

test('Swagger UI serves the OpenAPI specification for interactive API testing', async () => {
  const response = await fetch(`${baseUrl}/api-docs/`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(html, /EC API Documentation/);
  assert.match(html, /swagger-ui/);

  const bundle = await fetch(`${baseUrl}/api-docs/swagger-ui-bundle.js`);
  assert.equal(bundle.status, 200);
  assert.match(bundle.headers.get('content-type'), /javascript/);

  const initialization = await fetch(`${baseUrl}/api-docs/swagger-ui-init.js`);
  const initializer = await initialization.text();
  assert.equal(initialization.status, 200);
  assert.match(initializer, /adminLogin/);
});

test('readiness reports database outages as service unavailable', async () => {
  const originalQueryRaw = prisma.$queryRaw;
  const originalConsoleError = console.error;
  let loggedError;
  prisma.$queryRaw = async () => {
    throw new Error('database connection failed');
  };
  console.error = (_message, error) => {
    loggedError = error;
  };

  try {
    const response = await fetch(`${baseUrl}/api/health/ready`);
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.error.code, 'DATABASE_UNAVAILABLE');
    assert.equal(body.error.message, 'Database tidak tersedia.');
    assert.equal(loggedError.message, 'database connection failed');
  } finally {
    prisma.$queryRaw = originalQueryRaw;
    console.error = originalConsoleError;
  }
});

test('unknown endpoints return the standard 404 envelope', async () => {
  const response = await fetch(`${baseUrl}/api/unknown`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.code, 'NOT_FOUND');
});

test('public comment lookup rejects malformed target identifiers', async () => {
  const response = await fetch(`${baseUrl}/api/comments?target_type=news&target_id=not-a-uuid`);
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
});

test('admin endpoints require a bearer token', async () => {
  const paths = [
    '/api/admin/dashboard',
    '/api/admin/settings',
    '/api/admin/products/stats',
    '/api/admin/events/c8a47a0a-5d52-4c80-a94d-aec63a266a53/registrations',
    '/api/admin/recruitments',
    '/api/admin/applications',
    '/api/admin/partnerships',
    '/api/admin/comments',
    '/api/admin/products',
    '/api/admin/products/stats',
    '/api/admin/events',
    '/api/admin/events/c8a47a0a-5d52-4c80-a94d-aec63a266a53',
    '/api/admin/stats',
    '/api/admin/programs',
    '/api/admin/achievements',
    '/api/admin/social',
    '/api/admin/news',
    '/api/admin/partners',
    '/api/admin/upload',
  ];

  for (const path of paths) {
    const response = await fetch(`${baseUrl}${path}`);
    const body = await response.json();
    assert.equal(response.status, 401, path);
    assert.equal(body.error.code, 'UNAUTHORIZED', path);
  }
});

test('admin upload endpoint requires a bearer token before parsing files', async () => {
  const response = await fetch(`${baseUrl}/api/admin/upload`, { method: 'POST' });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, 'UNAUTHORIZED');
});

test('CORS rejects origins outside the configured allowlist', async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: 'https://not-allowed.example' },
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.error.code, 'CORS_ORIGIN_DENIED');
});

test('CORS allows the local API origin used by Swagger UI in development', async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    headers: { Origin: 'http://localhost:3000' },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:3000');
});
