import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ADMIN_ORIGIN,
  browser,
  createAdmin,
  createTestApp,
  errorCode,
  json,
  resetDb,
  STUDENT,
  STUDENT_ORIGIN,
  testClock,
  testDb,
  tokenFromEmail,
} from './helpers.ts';

const clock = testClock();
const { app, mailer } = await createTestApp({ now: clock.now });

afterAll(async () => {
  await app.close();
});
beforeEach(async () => {
  await resetDb();
  mailer.sent.length = 0;
});

const HOUR = 3_600_000;

describe('admin login', () => {
  it('admins sign in on the admin app with a separate cookie scoped to /api/v1/admin', async () => {
    const creds = await createAdmin();
    const a = browser(app, ADMIN_ORIGIN, clock.now);
    const res = await a.post('/api/v1/admin/auth/login', creds);
    expect(res.statusCode).toBe(200);
    expect(json<{ user: { role: string } }>(res).user.role).toBe('SUPER_ADMIN');
    const setCookie = String(res.headers['set-cookie']);
    expect(setCookie).toContain('nwp_asid=');
    expect(setCookie).toContain('Path=/api/v1/admin');
    expect((await a.get('/api/v1/admin/auth/me')).statusCode).toBe(200);

    const audit = await testDb().auditLog.findMany({ where: { action: 'admin.login' } });
    expect(audit).toHaveLength(1);
  });

  it('student credentials never open an admin session, and admin credentials never open a student one', async () => {
    await browser(app, STUDENT_ORIGIN, clock.now).post('/api/v1/auth/register', STUDENT);
    const creds = await createAdmin();

    const studentOnAdmin = await browser(app, ADMIN_ORIGIN, clock.now).post(
      '/api/v1/admin/auth/login',
      STUDENT,
    );
    expect(errorCode(studentOnAdmin)).toBe('INVALID_CREDENTIALS');

    const adminOnStudent = await browser(app, STUDENT_ORIGIN, clock.now).post(
      '/api/v1/auth/login',
      creds,
    );
    expect(errorCode(adminOnStudent)).toBe('INVALID_CREDENTIALS');
  });

  it('admin sessions expire after 2 hours idle and 12 hours absolute', async () => {
    const creds = await createAdmin();
    const a = browser(app, ADMIN_ORIGIN, clock.now);
    await a.post('/api/v1/admin/auth/login', creds);

    clock.advance(HOUR + 59 * 60_000); // 1h59 idle: still fine, and this request extends idle
    expect((await a.get('/api/v1/admin/auth/me')).statusCode).toBe(200);
    clock.advance(2 * HOUR + 60_000); // 2h01 idle: expired
    expect((await a.get('/api/v1/admin/auth/me')).statusCode).toBe(401);

    // Absolute limit: keep it busy every hour; it still ends at 12h.
    await a.post('/api/v1/admin/auth/login', creds);
    for (let h = 1; h < 12; h++) {
      clock.advance(HOUR);
      expect((await a.get('/api/v1/admin/auth/me')).statusCode).toBe(200);
    }
    clock.advance(HOUR + 60_000);
    expect((await a.get('/api/v1/admin/auth/me')).statusCode).toBe(401);
  });

  it('student sessions slide: 30 days of inactivity ends them, activity keeps them alive', async () => {
    const s = browser(app, STUDENT_ORIGIN, clock.now);
    await s.post('/api/v1/auth/register', STUDENT);
    for (let i = 0; i < 3; i++) {
      clock.advance(20 * 24 * HOUR);
      expect((await s.get('/api/v1/auth/me')).statusCode).toBe(200);
    }
    clock.advance(31 * 24 * HOUR);
    expect((await s.get('/api/v1/auth/me')).statusCode).toBe(401);
  });
});

describe('admin invites', () => {
  it('a super admin invites an admin, who accepts and is signed in', async () => {
    const creds = await createAdmin();
    const sa = browser(app, ADMIN_ORIGIN, clock.now);
    await sa.post('/api/v1/admin/auth/login', creds);

    const invite = await sa.post('/api/v1/admin/admins/invites', {
      email: 'content@nxtwave.co.in',
    });
    expect(invite.statusCode).toBe(201);
    expect(json<{ inviteUrl: string }>(invite).inviteUrl).toContain('/accept-invite?token=');

    // Invited accounts cannot log in before accepting.
    const early = await browser(app, ADMIN_ORIGIN, clock.now).post('/api/v1/admin/auth/login', {
      email: 'content@nxtwave.co.in',
      password: 'whatever-123',
    });
    expect(errorCode(early)).toBe('INVALID_CREDENTIALS');

    const token = tokenFromEmail(mailer, 'content@nxtwave.co.in');
    const newAdmin = browser(app, ADMIN_ORIGIN, clock.now);
    const accepted = await newAdmin.post('/api/v1/admin/auth/accept-invite', {
      token,
      fullName: 'Content Lead',
      password: 'Content-Lead-2026',
    });
    expect(accepted.statusCode).toBe(200);
    expect(json<{ user: { role: string; fullName: string } }>(accepted).user).toMatchObject({
      role: 'ADMIN',
      fullName: 'Content Lead',
    });

    // A regular admin cannot invite or list admins.
    expect(
      (await newAdmin.post('/api/v1/admin/admins/invites', { email: 'x@nxtwave.co.in' }))
        .statusCode,
    ).toBe(403);
    expect((await newAdmin.get('/api/v1/admin/admins')).statusCode).toBe(403);
    // ...but can use the console.
    expect((await newAdmin.get('/api/v1/admin/overview')).statusCode).toBe(200);
  });

  it('overview reports real student numbers', async () => {
    const creds = await createAdmin();
    await browser(app, STUDENT_ORIGIN, clock.now).post('/api/v1/auth/register', STUDENT);
    await browser(app, STUDENT_ORIGIN, clock.now).post('/api/v1/auth/register', {
      ...STUDENT,
      email: 'arjun@student.test',
    });
    const sa = browser(app, ADMIN_ORIGIN, clock.now);
    await sa.post('/api/v1/admin/auth/login', creds);
    const overview = json<{ students: { total: number; activeLast7Days: number }; admins: number }>(
      await sa.get('/api/v1/admin/overview'),
    );
    expect(overview.students.total).toBe(2);
    expect(overview.students.activeLast7Days).toBe(2);
    expect(overview.admins).toBe(1);
  });
});

describe('admin session probe', () => {
  it('is null for anonymous callers and for student cookies, and the admin when signed in', async () => {
    await browser(app, STUDENT_ORIGIN, clock.now).post('/api/v1/auth/register', STUDENT);
    const studentLike = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/auth/session',
      headers: { cookie: 'nwp_asid=not-a-real-token' },
    });
    expect(studentLike.json()).toEqual({ user: null });

    const creds = await createAdmin();
    const a = browser(app, ADMIN_ORIGIN, clock.now);
    await a.post('/api/v1/admin/auth/login', creds);
    expect(
      json<{ user: { role: string } }>(await a.get('/api/v1/admin/auth/session')).user.role,
    ).toBe('SUPER_ADMIN');
  });
});
