import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { GoogleIdentity, GoogleOidcClient } from '../src/modules/auth/google.ts';
import {
  ADMIN_ORIGIN,
  browser,
  createAdmin,
  createTestApp,
  json,
  resetDb,
  STUDENT,
  STUDENT_ORIGIN,
  testDb,
} from './helpers.ts';

/** Stands in for Google: records what we sent and returns a configurable identity. */
class FakeGoogle implements GoogleOidcClient {
  identity: GoogleIdentity = {
    sub: 'google-sub-1',
    email: 'priya.google@gmail.com',
    emailVerified: true,
    name: 'Priya G',
    hostedDomain: null,
  };
  lastAuth: { codeChallenge: string; nonce: string; hostedDomain?: string } | null = null;
  lastExchange: { codeVerifier: string; nonce: string } | null = null;

  authorizationUrl(p: {
    redirectUri: string;
    state: string;
    codeChallenge: string;
    nonce: string;
    hostedDomain?: string;
  }) {
    this.lastAuth = p;
    return `https://accounts.google.test/auth?state=${p.state}&redirect_uri=${encodeURIComponent(p.redirectUri)}`;
  }
  async exchange(p: { code: string; codeVerifier: string; redirectUri: string; nonce: string }) {
    if (p.code === 'bad') throw new Error('invalid_grant');
    this.lastExchange = p;
    return this.identity;
  }
}

const google = new FakeGoogle();
let app: FastifyInstance;
let restricted: FastifyInstance;
beforeAll(async () => {
  ({ app } = await createTestApp({ google }));
  ({ app: restricted } = await createTestApp({
    google,
    env: { ADMIN_GOOGLE_ALLOWED_DOMAINS: ['nxtwave.co.in'] },
  }));
});
afterAll(async () => {
  await app.close();
  await restricted.close();
});
beforeEach(async () => {
  await resetDb();
  google.identity = {
    sub: 'google-sub-1',
    email: 'priya.google@gmail.com',
    emailVerified: true,
    name: 'Priya G',
    hostedDomain: null,
  };
});

/** Runs start → (Google) → callback like a browser and returns where it lands. */
async function signIn(
  b: ReturnType<typeof browser>,
  base: string,
  next?: string,
  code = 'good-code',
) {
  const start = await b.get(
    `${base}/google/start${next ? `?next=${encodeURIComponent(next)}` : ''}`,
  );
  expect(start.statusCode).toBe(302);
  const state = new URL(String(start.headers.location)).searchParams.get('state') ?? '';
  const cb = await b.get(`${base}/google/callback?state=${state}&code=${code}&scope=openid`);
  expect(cb.statusCode).toBe(302);
  return { location: String(cb.headers.location), state };
}

describe('Google sign-in for students', () => {
  it('reports that Google is configured', async () => {
    expect(json(await app.inject({ method: 'GET', url: '/api/v1/auth/providers' }))).toEqual({
      google: true,
      registration: 'OPEN',
    });
    const { app: off } = await createTestApp();
    expect(json(await off.inject({ method: 'GET', url: '/api/v1/auth/providers' }))).toEqual({
      google: false,
      registration: 'OPEN',
    });
    await off.close();
  });

  it('creates a verified student, links the Google account and signs them in (PKCE checked)', async () => {
    const b = browser(app, STUDENT_ORIGIN);
    const { location } = await signIn(b, '/api/v1/auth', '/plan');
    expect(location).toBe('http://student.test/plan');

    // PKCE: the verifier we exchanged hashes to the challenge we sent to Google.
    const challenge = createHash('sha256')
      .update(google.lastExchange?.codeVerifier ?? '')
      .digest('base64url');
    expect(challenge).toBe(google.lastAuth?.codeChallenge);
    expect(google.lastExchange?.nonce).toBe(google.lastAuth?.nonce);

    const me = json<{ user: { email: string; fullName: string; emailVerified: boolean } }>(
      await b.get('/api/v1/auth/me'),
    );
    expect(me.user).toMatchObject({
      email: 'priya.google@gmail.com',
      fullName: 'Priya G',
      emailVerified: true,
    });
    const user = await testDb().user.findUniqueOrThrow({
      where: { email: 'priya.google@gmail.com' },
      include: { identities: true },
    });
    expect(user.passwordHash).toBeNull();
    expect(user.identities).toHaveLength(1);
  });

  it('links to an existing email/password account instead of creating a duplicate', async () => {
    await browser(app, STUDENT_ORIGIN).post('/api/v1/auth/register', {
      ...STUDENT,
      email: 'priya.google@gmail.com',
    });
    const b = browser(app, STUDENT_ORIGIN);
    await signIn(b, '/api/v1/auth');
    await signIn(b, '/api/v1/auth'); // second time matches by Google id
    expect(await testDb().user.count()).toBe(1);
    expect(await testDb().userIdentity.count()).toBe(1);
  });

  it('rejects a callback that this browser did not start (login CSRF) and reused attempts', async () => {
    const victim = browser(app, STUDENT_ORIGIN);
    const attacker = browser(app, STUDENT_ORIGIN);
    const start = await attacker.get('/api/v1/auth/google/start');
    const state = new URL(String(start.headers.location)).searchParams.get('state');

    const forged = await victim.get(`/api/v1/auth/google/callback?state=${state}&code=good-code`);
    expect(forged.headers.location).toBe('http://student.test/login?error=google_expired');
    expect(victim.jar.has('nwp_sid')).toBe(false);

    // The browser that really started it can still finish (the forgery did not consume it)...
    const real = await attacker.get(`/api/v1/auth/google/callback?state=${state}&code=good-code`);
    expect(real.headers.location).toBe('http://student.test/');

    // ...but the attempt is single use: replaying it, even with the flow cookie, fails.
    const replay = await app.inject({
      method: 'GET',
      url: `/api/v1/auth/google/callback?state=${state}&code=good-code`,
      headers: { cookie: `nwp_oauth=${state}` },
    });
    expect(replay.headers.location).toBe('http://student.test/login?error=google_expired');
  });

  it('maps cancel, failed exchange and unverified email to friendly errors', async () => {
    const b = browser(app, STUDENT_ORIGIN);
    const cancelled = await b.get('/api/v1/auth/google/callback?error=access_denied');
    expect(cancelled.headers.location).toBe('http://student.test/login?error=google_cancelled');

    expect((await signIn(b, '/api/v1/auth', undefined, 'bad')).location).toContain(
      'error=google_failed',
    );

    google.identity = { ...google.identity, emailVerified: false };
    expect((await signIn(browser(app, STUDENT_ORIGIN), '/api/v1/auth')).location).toContain(
      'error=google_unverified',
    );
  });

  it('respects the sign-up policy and never lets a staff account in as a student', async () => {
    await testDb().platformSetting.create({
      data: { key: 'registration.policy', value: 'ALLOWLIST' },
    });
    expect((await signIn(browser(app, STUDENT_ORIGIN), '/api/v1/auth')).location).toContain(
      'error=registration_closed',
    );

    await createAdmin('priya.google@gmail.com');
    expect((await signIn(browser(app, STUDENT_ORIGIN), '/api/v1/auth')).location).toContain(
      'error=not_student',
    );
  });

  it('ignores open-redirect attempts in `next`', async () => {
    const { location } = await signIn(
      browser(app, STUDENT_ORIGIN),
      '/api/v1/auth',
      '//evil.example/steal',
    );
    expect(location).toBe('http://student.test/');
  });
});

describe('Google sign-in for admins', () => {
  it('never creates admins: an unknown Google account is refused', async () => {
    const { location } = await signIn(browser(app, ADMIN_ORIGIN), '/api/v1/admin/auth');
    expect(location).toBe('http://admin.test/login?error=not_admin');
    expect(await testDb().user.count()).toBe(0);
  });

  it('signs in an existing admin and accepts a pending invite', async () => {
    const sa = browser(app, ADMIN_ORIGIN);
    const creds = await createAdmin('lead@nxtwave.co.in');
    await sa.post('/api/v1/admin/auth/login', creds);
    await sa.post('/api/v1/admin/admins/invites', { email: 'content@nxtwave.co.in' });

    google.identity = {
      sub: 'g-content',
      email: 'content@nxtwave.co.in',
      emailVerified: true,
      name: 'Content Lead',
      hostedDomain: 'nxtwave.co.in',
    };
    const a = browser(app, ADMIN_ORIGIN);
    const { location } = await signIn(a, '/api/v1/admin/auth');
    expect(location).toBe('http://admin.test/');
    const me = json<{ user: { email: string; fullName: string } }>(
      await a.get('/api/v1/admin/auth/me'),
    );
    expect(me.user).toMatchObject({ email: 'content@nxtwave.co.in', fullName: 'Content Lead' });
    expect(
      (await testDb().user.findUniqueOrThrow({ where: { email: 'content@nxtwave.co.in' } })).status,
    ).toBe('ACTIVE');
  });

  it('enforces the allowed admin email domains', async () => {
    await createAdmin('outsider@gmail.com');
    google.identity = { ...google.identity, email: 'outsider@gmail.com' };
    const { location } = await signIn(browser(restricted, ADMIN_ORIGIN), '/api/v1/admin/auth');
    expect(location).toBe('http://admin.test/login?error=domain_not_allowed');
    expect(google.lastAuth?.hostedDomain).toBe('nxtwave.co.in');
  });
});
