import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ADMIN_ORIGIN,
  browser,
  createAdmin,
  createTestApp,
  errorCode,
  resetDb,
  STUDENT,
  STUDENT_ORIGIN,
} from './helpers.ts';

/**
 * Enumerates EVERY registered route and checks that callers without the right session are
 * refused. New routes are covered automatically, so a forgotten guard fails this test.
 */
const { app } = await createTestApp();

// Endpoints that are deliberately reachable without a session.
const PUBLIC = new Set([
  'GET /api/v1/auth/session',
  'GET /api/v1/auth/providers',
  'GET /api/v1/auth/google/start',
  'GET /api/v1/auth/google/callback',
  'POST /api/v1/auth/register',
  'POST /api/v1/auth/login',
  'POST /api/v1/auth/logout',
  'POST /api/v1/auth/verify-email',
  'POST /api/v1/auth/forgot-password',
  'POST /api/v1/auth/reset-password',
  'GET /api/v1/admin/auth/session',
  'GET /api/v1/admin/auth/providers',
  'GET /api/v1/admin/auth/google/start',
  'GET /api/v1/admin/auth/google/callback',
  'POST /api/v1/admin/auth/login',
  'POST /api/v1/admin/auth/logout',
  'POST /api/v1/admin/auth/forgot-password',
  'POST /api/v1/admin/auth/reset-password',
  'POST /api/v1/admin/auth/accept-invite',
  'GET /api/health',
  'GET /api/ready',
]);

const routes = app.routeIndex
  .filter((r) => r.url.startsWith('/api/') && !r.url.startsWith('/api/docs'))
  .filter((r) => r.method !== 'HEAD' && r.method !== 'OPTIONS')
  .map((r) => ({ ...r, url: r.url.replace(/:[A-Za-z]+/g, '00000000-0000-7000-8000-000000000000') }))
  .filter((r) => !PUBLIC.has(`${r.method} ${r.url}`));

const adminRoutes = routes.filter((r) => r.url.startsWith('/api/v1/admin'));
const studentRoutes = routes.filter((r) => !r.url.startsWith('/api/v1/admin'));

let student: ReturnType<typeof browser>;
let studentCookie: string;

beforeAll(async () => {
  await resetDb();
  student = browser(app, STUDENT_ORIGIN);
  await student.post('/api/v1/auth/register', STUDENT);
  studentCookie = `nwp_sid=${student.jar.get('nwp_sid')}`;
});
afterAll(async () => {
  await app.close();
});

describe('authorization matrix', () => {
  it('discovers the protected routes', () => {
    expect(adminRoutes.length).toBeGreaterThanOrEqual(3);
    expect(studentRoutes.length).toBeGreaterThanOrEqual(4);
  });

  it.each(adminRoutes)('admin route $method $url refuses anonymous callers', async (r) => {
    const res = await app.inject({
      method: r.method as 'GET',
      url: r.url,
      headers: { origin: ADMIN_ORIGIN },
      ...(r.method === 'GET' ? {} : { payload: {} }),
    });
    expect(res.statusCode).toBe(401);
  });

  it.each(adminRoutes)(
    'admin route $method $url refuses a student session (even sent to the admin path)',
    async (r) => {
      const res = await app.inject({
        method: r.method as 'GET',
        url: r.url,
        headers: {
          origin: ADMIN_ORIGIN,
          cookie: `${studentCookie}; nwp_asid=${student.jar.get('nwp_sid')}`,
        },
        ...(r.method === 'GET' ? {} : { payload: {} }),
      });
      expect(res.statusCode).toBe(401);
    },
  );

  it.each(studentRoutes)('student route $method $url refuses anonymous callers', async (r) => {
    const res = await app.inject({
      method: r.method as 'GET',
      url: r.url,
      headers: { origin: STUDENT_ORIGIN },
      ...(r.method === 'GET' ? {} : { payload: {} }),
    });
    expect(res.statusCode).toBe(401);
  });

  it('student routes refuse an admin session', async () => {
    const creds = await createAdmin('matrix-admin@test.local');
    const admin = browser(app, ADMIN_ORIGIN);
    await admin.post('/api/v1/admin/auth/login', creds);
    const adminToken = admin.jar.get('nwp_asid');
    for (const r of studentRoutes) {
      const res = await app.inject({
        method: r.method as 'GET',
        url: r.url,
        headers: { origin: STUDENT_ORIGIN, cookie: `nwp_sid=${adminToken}` },
        ...(r.method === 'GET' ? {} : { payload: {} }),
      });
      expect(res.statusCode, `${r.method} ${r.url}`).toBe(401);
    }
  });
});

describe('cross-site request protection', () => {
  it('rejects state-changing requests from a foreign origin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: STUDENT,
      headers: { origin: 'https://evil.example' },
    });
    expect(res.statusCode).toBe(403);
    expect(errorCode(res)).toBe('FORBIDDEN');
  });

  it('the admin namespace only accepts the admin app origin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      payload: STUDENT,
      headers: { origin: STUDENT_ORIGIN },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects requests with no origin information', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: STUDENT });
    expect(res.statusCode).toBe(403);
  });
});
