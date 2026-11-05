import type { SessionAudience } from '../../generated/prisma/enums.ts';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Student sessions slide for 30 days of inactivity.
 * Admin sessions are short: 12 hours absolute and 2 hours idle.
 * `touchAfter` avoids a DB write on every request.
 */
export const SESSION_POLICY = {
  STUDENT: { lifetime: 30 * DAY, idle: null, touchAfter: HOUR },
  ADMIN: { lifetime: 12 * HOUR, idle: 2 * HOUR, touchAfter: MINUTE },
} as const satisfies Record<
  SessionAudience,
  { lifetime: number; idle: number | null; touchAfter: number }
>;

export interface SessionTimes {
  createdAt: Date;
  expiresAt: Date;
  idleExpiresAt: Date | null;
  lastSeenAt: Date;
  revokedAt: Date | null;
}

export function initialTimes(
  audience: SessionAudience,
  now: Date,
): Omit<SessionTimes, 'revokedAt'> {
  const p = SESSION_POLICY[audience];
  return {
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + p.lifetime),
    idleExpiresAt: p.idle === null ? null : new Date(now.getTime() + p.idle),
  };
}

export function isSessionLive(s: SessionTimes, now: Date): boolean {
  if (s.revokedAt) return false;
  if (s.expiresAt <= now) return false;
  if (s.idleExpiresAt && s.idleExpiresAt <= now) return false;
  return true;
}

/** Returns the new times when the session should be extended, or null when no write is needed. */
export function touchTimes(
  audience: SessionAudience,
  s: SessionTimes,
  now: Date,
): Pick<SessionTimes, 'lastSeenAt' | 'expiresAt' | 'idleExpiresAt'> | null {
  const p = SESSION_POLICY[audience];
  if (now.getTime() - s.lastSeenAt.getTime() < p.touchAfter) return null;
  if (audience === 'STUDENT') {
    // Sliding window.
    return {
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + p.lifetime),
      idleExpiresAt: null,
    };
  }
  // Admin: absolute expiry never moves; only the idle deadline does.
  return {
    lastSeenAt: now,
    expiresAt: s.expiresAt,
    idleExpiresAt: p.idle === null ? null : new Date(now.getTime() + p.idle),
  };
}
