import type { AppContext } from '../../context.ts';
import type { AuthTokenType } from '../../generated/prisma/enums.ts';
import { generateToken, sha256Hex } from '../../lib/crypto.ts';
import { AppError } from '../../lib/errors.ts';

const HOUR = 3_600_000;

export const TOKEN_TTL: Record<AuthTokenType, number> = {
  EMAIL_VERIFICATION: 24 * HOUR,
  PASSWORD_RESET: 1 * HOUR,
  ADMIN_INVITE: 72 * HOUR,
};

/** Single-use, hashed, expiring tokens for email links. */
export class TokenService {
  constructor(private readonly ctx: AppContext) {}

  /** Issues a fresh token and invalidates any earlier unused token of the same type. */
  async issue(userId: string, type: AuthTokenType) {
    const now = this.ctx.now();
    const token = generateToken();
    const expiresAt = new Date(now.getTime() + TOKEN_TTL[type]);
    await this.ctx.db.$transaction([
      this.ctx.db.authToken.updateMany({
        where: { userId, type, usedAt: null },
        data: { usedAt: now },
      }),
      this.ctx.db.authToken.create({
        data: { userId, type, tokenHash: sha256Hex(token), expiresAt },
      }),
    ]);
    return { token, expiresAt };
  }

  /** Atomically marks the token used and returns its user id. Throws TOKEN_INVALID otherwise. */
  async consume(token: string, type: AuthTokenType): Promise<{ userId: string }> {
    const now = this.ctx.now();
    const row = await this.ctx.db.authToken.findUnique({ where: { tokenHash: sha256Hex(token) } });
    if (!row || row.type !== type || row.usedAt || row.expiresAt <= now) {
      throw new AppError(
        'TOKEN_INVALID',
        'This link is invalid or has expired. Request a new one.',
      );
    }
    // Guard against two requests using the same token at the same moment.
    const { count } = await this.ctx.db.authToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: now },
    });
    if (count !== 1) {
      throw new AppError('TOKEN_INVALID', 'This link has already been used. Request a new one.');
    }
    return { userId: row.userId };
  }
}
