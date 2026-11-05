import type { AppContext, RequestMeta } from '../../context.ts';
import type { SessionAudience } from '../../generated/prisma/enums.ts';
import { generateToken, sha256Hex } from '../../lib/crypto.ts';
import { initialTimes, isSessionLive, touchTimes } from './session.policy.ts';

const userInclude = { studentProfile: true, adminProfile: true } as const;

export type SessionUser = NonNullable<Awaited<ReturnType<SessionService['validate']>>>['user'];
export type SessionRecord = NonNullable<Awaited<ReturnType<SessionService['validate']>>>['session'];

export class SessionService {
  constructor(private readonly ctx: AppContext) {}

  /** Creates a session and returns the raw token (to be put in the cookie) and its expiry. */
  async create(userId: string, audience: SessionAudience, meta: RequestMeta) {
    const token = generateToken();
    const times = initialTimes(audience, this.ctx.now());
    await this.ctx.db.session.create({
      data: {
        id: sha256Hex(token),
        userId,
        audience,
        ...times,
        ip: meta.ip,
        userAgent: meta.userAgent?.slice(0, 400) ?? null,
      },
    });
    return { token, expiresAt: times.expiresAt };
  }

  /**
   * Resolves a raw cookie token into a live session for the given audience.
   * Expired, revoked or wrong-audience sessions resolve to null.
   */
  async validate(token: string, audience: SessionAudience) {
    const now = this.ctx.now();
    const session = await this.ctx.db.session.findUnique({
      where: { id: sha256Hex(token) },
      include: { user: { include: userInclude } },
    });
    if (!session || session.audience !== audience || !isSessionLive(session, now)) return null;
    if (session.user.status !== 'ACTIVE') return null;

    const next = touchTimes(audience, session, now);
    if (next) {
      await this.ctx.db.session.update({ where: { id: session.id }, data: next });
      Object.assign(session, next);
    }
    const { user, ...rest } = session;
    return { session: rest, user };
  }

  async revokeByToken(token: string): Promise<void> {
    await this.ctx.db.session.updateMany({
      where: { id: sha256Hex(token), revokedAt: null },
      data: { revokedAt: this.ctx.now() },
    });
  }

  /** Signs the user out everywhere, optionally keeping the current session. */
  async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<void> {
    await this.ctx.db.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: this.ctx.now() },
    });
  }
}
