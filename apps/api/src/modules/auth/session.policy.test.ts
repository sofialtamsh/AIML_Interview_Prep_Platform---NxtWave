import { describe, expect, it } from 'vitest';
import { initialTimes, isSessionLive, SESSION_POLICY, touchTimes } from './session.policy.ts';

const t0 = new Date('2026-11-03T00:00:00Z');
const at = (ms: number) => new Date(t0.getTime() + ms);
const MIN = 60_000;
const HOUR = 60 * MIN;

describe('session policy', () => {
  it('student sessions start with a 30-day window and no idle limit', () => {
    const s = initialTimes('STUDENT', t0);
    expect(s.expiresAt.getTime() - t0.getTime()).toBe(SESSION_POLICY.STUDENT.lifetime);
    expect(s.idleExpiresAt).toBeNull();
  });

  it('does not write on every request (touchAfter)', () => {
    const s = { ...initialTimes('STUDENT', t0), revokedAt: null };
    expect(touchTimes('STUDENT', s, at(30 * MIN))).toBeNull();
    expect(touchTimes('STUDENT', s, at(2 * HOUR))?.expiresAt).toEqual(
      at(2 * HOUR + SESSION_POLICY.STUDENT.lifetime),
    );
  });

  it('admin touches never extend the absolute expiry', () => {
    const s = { ...initialTimes('ADMIN', t0), revokedAt: null };
    const next = touchTimes('ADMIN', s, at(5 * MIN));
    expect(next?.expiresAt).toEqual(s.expiresAt);
    expect(next?.idleExpiresAt).toEqual(at(5 * MIN + 2 * HOUR));
  });

  it('revoked, expired and idle sessions are not live', () => {
    const s = { ...initialTimes('ADMIN', t0), revokedAt: null };
    expect(isSessionLive(s, at(MIN))).toBe(true);
    expect(isSessionLive({ ...s, revokedAt: at(1) }, at(MIN))).toBe(false);
    expect(isSessionLive(s, at(2 * HOUR + 1))).toBe(false);
    expect(isSessionLive(s, at(13 * HOUR))).toBe(false);
  });
});
