import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { purgeExpiredAuthRecords } from '../src/jobs/maintenance.ts';
import {
  browser,
  createTestApp,
  errorCode,
  resetDb,
  STUDENT,
  STUDENT_ORIGIN,
  testDb,
} from './helpers.ts';

const { app, ctx } = await createTestApp({ rateLimit: true });

afterAll(async () => {
  await app.close();
});
beforeEach(async () => {
  await resetDb();
});

describe('platform', () => {
  it('health and readiness endpoints report status', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/health' })).json()).toEqual({
      status: 'ok',
    });
    expect((await app.inject({ method: 'GET', url: '/api/ready' })).json()).toEqual({
      status: 'ready',
      database: true,
    });
  });

  it('returns the documented error envelope with a request id for unknown routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/nope' });
    expect(res.statusCode).toBe(404);
    const body = res.json() as { error: { code: string; requestId: string } };
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toBe(res.headers['x-request-id']);
  });

  it('sets security headers', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('rate-limits brute-force login attempts', async () => {
    const b = browser(app, STUDENT_ORIGIN);
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await b.post('/api/v1/auth/login', {
        email: STUDENT.email,
        password: `guess-${i}`,
      });
      statuses.push(res.statusCode);
      if (res.statusCode === 429) expect(errorCode(res)).toBe('RATE_LIMITED');
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  it('the maintenance job purges long-dead sessions and tokens', async () => {
    const db = testDb();
    const user = await db.user.create({ data: { email: 'old@student.test', role: 'STUDENT' } });
    const longAgo = new Date(Date.now() - 30 * 86_400_000);
    await db.session.create({
      data: { id: 'dead', userId: user.id, audience: 'STUDENT', expiresAt: longAgo },
    });
    await db.session.create({
      data: {
        id: 'alive',
        userId: user.id,
        audience: 'STUDENT',
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    const result = await purgeExpiredAuthRecords(ctx);
    expect(result.sessionsDeleted).toBe(1);
    expect(await db.session.count()).toBe(1);
  });
});
