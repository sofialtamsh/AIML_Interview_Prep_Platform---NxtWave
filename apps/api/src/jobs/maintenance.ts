import type { AppContext } from '../context.ts';

const DAY = 86_400_000;

/** Removes sessions and email-link tokens that have been dead for more than 7 days. */
export async function purgeExpiredAuthRecords(ctx: AppContext) {
  const cutoff = new Date(ctx.now().getTime() - 7 * DAY);
  const [sessions, tokens, oauth] = await ctx.db.$transaction([
    ctx.db.session.deleteMany({
      where: { OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }] },
    }),
    ctx.db.authToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: cutoff } }, { usedAt: { lt: cutoff } }] },
    }),
    ctx.db.oAuthLoginAttempt.deleteMany({ where: { expiresAt: { lt: ctx.now() } } }),
  ]);
  return {
    sessionsDeleted: sessions.count,
    tokensDeleted: tokens.count,
    oauthAttemptsDeleted: oauth.count,
  };
}
