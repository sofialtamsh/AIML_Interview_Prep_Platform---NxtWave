import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { MemoryMailer } from '../src/mail/mailer.ts';
import {
  browser,
  createTestApp,
  errorCode,
  json,
  resetDb,
  STUDENT,
  STUDENT_ORIGIN,
  testDb,
  tokenFromEmail,
} from './helpers.ts';

let app: FastifyInstance;
let mailer: MemoryMailer;

beforeAll(async () => {
  ({ app, mailer } = await createTestApp());
});
afterAll(async () => {
  await app.close();
});
beforeEach(async () => {
  await resetDb();
  mailer.sent.length = 0;
});

async function registered() {
  const b = browser(app, STUDENT_ORIGIN);
  const res = await b.post('/api/v1/auth/register', STUDENT);
  expect(res.statusCode).toBe(201);
  return b;
}

describe('student registration', () => {
  it('creates the account, signs the student in with an HttpOnly cookie and emails a verification link', async () => {
    const b = browser(app, STUDENT_ORIGIN);
    const res = await b.post('/api/v1/auth/register', {
      ...STUDENT,
      email: '  Priya@Student.TEST ',
    });

    expect(res.statusCode).toBe(201);
    const { user } = json<{ user: Record<string, unknown> }>(res);
    expect(user).toMatchObject({
      email: 'priya@student.test',
      fullName: 'Priya Sharma',
      emailVerified: false,
      onboardingCompleted: false,
    });
    expect(user).not.toHaveProperty('passwordHash');

    const setCookie = String(res.headers['set-cookie']);
    expect(setCookie).toContain('nwp_sid=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/api/v1');

    expect(mailer.last('priya@student.test')?.tag).toBe('email-verification');
    expect((await b.get('/api/v1/auth/me')).statusCode).toBe(200);

    const stored = await testDb().user.findUniqueOrThrow({
      where: { email: 'priya@student.test' },
    });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('rejects a duplicate email', async () => {
    await registered();
    const res = await browser(app, STUDENT_ORIGIN).post('/api/v1/auth/register', STUDENT);
    expect(res.statusCode).toBe(409);
    expect(errorCode(res)).toBe('EMAIL_TAKEN');
  });

  it('validates input and reports field errors', async () => {
    const res = await browser(app, STUDENT_ORIGIN).post('/api/v1/auth/register', {
      email: 'not-an-email',
      password: 'password123',
      fullName: '',
    });
    expect(res.statusCode).toBe(400);
    const body = json<{ error: { code: string; details: { fields: Record<string, string> } } }>(
      res,
    );
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(body.error.details.fields).sort()).toEqual([
      'email',
      'fullName',
      'password',
    ]);
  });
});

describe('login and logout', () => {
  it('returns the same generic error for a wrong password and an unknown email', async () => {
    await registered();
    const wrong = await browser(app, STUDENT_ORIGIN).post('/api/v1/auth/login', {
      email: STUDENT.email,
      password: 'wrong-password',
    });
    const unknown = await browser(app, STUDENT_ORIGIN).post('/api/v1/auth/login', {
      email: 'nobody@student.test',
      password: 'wrong-password',
    });
    for (const res of [wrong, unknown]) {
      expect(res.statusCode).toBe(401);
      expect(json<{ error: { code: string; message: string } }>(res).error).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
      });
    }
  });

  it('logout revokes the session server-side, not just the cookie', async () => {
    const b = await registered();
    const stolenCookie = b.jar.get('nwp_sid');
    expect((await b.post('/api/v1/auth/logout')).statusCode).toBe(200);
    expect((await b.get('/api/v1/auth/me')).statusCode).toBe(401);

    const replay = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: `nwp_sid=${stolenCookie}` },
    });
    expect(replay.statusCode).toBe(401);
  });

  it('blocks suspended accounts', async () => {
    await registered();
    await testDb().user.update({ where: { email: STUDENT.email }, data: { status: 'SUSPENDED' } });
    const res = await browser(app, STUDENT_ORIGIN).post('/api/v1/auth/login', STUDENT);
    expect(res.statusCode).toBe(403);
    expect(errorCode(res)).toBe('ACCOUNT_SUSPENDED');
  });
});

describe('email verification', () => {
  it('verifies with the emailed token, and the token works only once', async () => {
    const b = await registered();
    const token = tokenFromEmail(mailer, STUDENT.email);

    expect((await b.post('/api/v1/auth/verify-email', { token })).statusCode).toBe(200);
    expect(
      json<{ user: { emailVerified: boolean } }>(await b.get('/api/v1/auth/me')).user.emailVerified,
    ).toBe(true);

    const again = await b.post('/api/v1/auth/verify-email', { token });
    expect(again.statusCode).toBe(400);
    expect(errorCode(again)).toBe('TOKEN_INVALID');
  });

  it('resending invalidates the previous link', async () => {
    const b = await registered();
    const first = tokenFromEmail(mailer, STUDENT.email);
    expect((await b.post('/api/v1/auth/resend-verification')).statusCode).toBe(200);
    const second = tokenFromEmail(mailer, STUDENT.email);
    expect(second).not.toBe(first);
    expect(errorCode(await b.post('/api/v1/auth/verify-email', { token: first }))).toBe(
      'TOKEN_INVALID',
    );
    expect((await b.post('/api/v1/auth/verify-email', { token: second })).statusCode).toBe(200);
  });
});

describe('password reset and change', () => {
  it('does not reveal whether an email is registered', async () => {
    const res = await browser(app, STUDENT_ORIGIN).post('/api/v1/auth/forgot-password', {
      email: 'nobody@student.test',
    });
    expect(res.statusCode).toBe(200);
    expect(mailer.sent).toHaveLength(0);
  });

  it('resets the password, signs out every session, and the link works once', async () => {
    const device1 = await registered();
    const anon = browser(app, STUDENT_ORIGIN);
    await anon.post('/api/v1/auth/forgot-password', { email: STUDENT.email });
    const token = tokenFromEmail(mailer, STUDENT.email);

    const reset = await anon.post('/api/v1/auth/reset-password', {
      token,
      password: 'New-Secret-Phrase-9',
    });
    expect(reset.statusCode).toBe(200);
    expect((await device1.get('/api/v1/auth/me')).statusCode).toBe(401);

    expect((await anon.post('/api/v1/auth/login', STUDENT)).statusCode).toBe(401);
    const login = await anon.post('/api/v1/auth/login', {
      email: STUDENT.email,
      password: 'New-Secret-Phrase-9',
    });
    expect(login.statusCode).toBe(200);
    // Following the emailed link also proves the email address.
    expect(json<{ user: { emailVerified: boolean } }>(login).user.emailVerified).toBe(true);

    const reuse = await anon.post('/api/v1/auth/reset-password', {
      token,
      password: 'Another-Phrase-10',
    });
    expect(errorCode(reuse)).toBe('TOKEN_INVALID');
  });

  it('change-password requires the current password and keeps only the current session', async () => {
    const device1 = await registered();
    const device2 = browser(app, STUDENT_ORIGIN);
    await device2.post('/api/v1/auth/login', STUDENT);

    const wrong = await device1.post('/api/v1/auth/change-password', {
      currentPassword: 'nope',
      newPassword: 'Fresh-Password-77',
    });
    expect(wrong.statusCode).toBe(400);

    const ok = await device1.post('/api/v1/auth/change-password', {
      currentPassword: STUDENT.password,
      newPassword: 'Fresh-Password-77',
    });
    expect(ok.statusCode).toBe(200);
    expect((await device1.get('/api/v1/auth/me')).statusCode).toBe(200);
    expect((await device2.get('/api/v1/auth/me')).statusCode).toBe(401);
  });
});

describe('registration policy', () => {
  it('ALLOWLIST only admits listed emails or domains', async () => {
    const db = testDb();
    await db.platformSetting.create({ data: { key: 'registration.policy', value: 'ALLOWLIST' } });
    await db.enrollmentAllowlist.create({ data: { domain: 'nxtwave.co.in' } });
    await db.enrollmentAllowlist.create({ data: { email: 'guest@gmail.com' } });

    const blocked = await browser(app, STUDENT_ORIGIN).post('/api/v1/auth/register', STUDENT);
    expect(blocked.statusCode).toBe(403);
    expect(errorCode(blocked)).toBe('REGISTRATION_CLOSED');

    for (const email of ['ravi@nxtwave.co.in', 'guest@gmail.com']) {
      const res = await browser(app, STUDENT_ORIGIN).post('/api/v1/auth/register', {
        ...STUDENT,
        email,
      });
      expect(res.statusCode).toBe(201);
    }
    const used = await db.enrollmentAllowlist.findUniqueOrThrow({
      where: { email: 'guest@gmail.com' },
    });
    expect(used.usedAt).not.toBeNull();
  });

  it('INVITE_ONLY blocks self sign-up', async () => {
    await testDb().platformSetting.create({
      data: { key: 'registration.policy', value: 'INVITE_ONLY' },
    });
    const res = await browser(app, STUDENT_ORIGIN).post('/api/v1/auth/register', STUDENT);
    expect(errorCode(res)).toBe('REGISTRATION_CLOSED');
  });
});

describe('profile', () => {
  it('updates name and timezone, and rejects unknown timezones', async () => {
    const b = await registered();
    const ok = await b.patch('/api/v1/student/profile', {
      fullName: 'Priya S.',
      timezone: 'Asia/Kolkata',
    });
    expect(json<{ user: { fullName: string } }>(ok).user.fullName).toBe('Priya S.');

    const bad = await b.patch('/api/v1/student/profile', { timezone: 'Mars/Olympus' });
    expect(bad.statusCode).toBe(400);
  });
});

describe('session probe', () => {
  it('returns 200 with user null when signed out, and the student when signed in', async () => {
    const anon = await browser(app, STUDENT_ORIGIN).get('/api/v1/auth/session');
    expect(anon.statusCode).toBe(200);
    expect(json(anon)).toEqual({ user: null });

    const b = await registered();
    const res = await b.get('/api/v1/auth/session');
    expect(json<{ user: { email: string } }>(res).user.email).toBe(STUDENT.email);

    await b.post('/api/v1/auth/logout');
    expect(json(await b.get('/api/v1/auth/session'))).toEqual({ user: null });
  });
});
