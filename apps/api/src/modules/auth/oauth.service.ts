import type { AppContext, RequestMeta } from '../../context.ts';
import type { SessionAudience, UserRole } from '../../generated/prisma/enums.ts';
import { generateToken, sha256Hex } from '../../lib/crypto.ts';
import { AuditService } from '../audit/audit.service.ts';
import { SettingsService } from '../settings/settings.service.ts';
import { type GoogleIdentity, pkcePair } from './google.ts';
import { SessionService } from './session.service.ts';

const FLOW_TTL_MS = 10 * 60_000;
const ADMIN_ROLES: readonly UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

/** Reasons a Google sign-in can end; the apps turn these into friendly messages. */
export type OAuthErrorCode =
  | 'google_cancelled'
  | 'google_expired'
  | 'google_failed'
  | 'google_unverified'
  | 'not_student'
  | 'not_admin'
  | 'domain_not_allowed'
  | 'suspended'
  | 'registration_closed';

export class OAuthError extends Error {
  constructor(readonly code: OAuthErrorCode) {
    super(code);
  }
}

/** Same-app relative path only (no open redirects). */
export function safeNext(next: unknown): string {
  return typeof next === 'string' &&
    next.startsWith('/') &&
    !next.startsWith('//') &&
    next.length < 500
    ? next
    : '/';
}

/** "Continue with Google" for students (create or link) and admins (existing accounts only). */
export class OAuthService {
  private readonly sessions: SessionService;
  private readonly audit: AuditService;
  private readonly settings: SettingsService;

  constructor(private readonly ctx: AppContext) {
    this.sessions = new SessionService(ctx);
    this.audit = new AuditService(ctx);
    this.settings = new SettingsService(ctx);
  }

  get googleEnabled(): boolean {
    return this.ctx.google !== null;
  }

  redirectUri(audience: SessionAudience): string {
    return audience === 'ADMIN'
      ? `${this.ctx.env.ADMIN_APP_URL}/api/v1/admin/auth/google/callback`
      : `${this.ctx.env.STUDENT_APP_URL}/api/v1/auth/google/callback`;
  }

  appUrl(audience: SessionAudience): string {
    return audience === 'ADMIN' ? this.ctx.env.ADMIN_APP_URL : this.ctx.env.STUDENT_APP_URL;
  }

  /** Starts a sign-in: stores a single-use attempt and returns Google's URL plus the browser-binding state. */
  async startGoogle(audience: SessionAudience, next: unknown) {
    if (!this.ctx.google) throw new OAuthError('google_failed');
    const state = generateToken();
    const nonce = generateToken();
    const { verifier, challenge } = pkcePair();
    await this.ctx.db.oAuthLoginAttempt.create({
      data: {
        id: sha256Hex(state),
        provider: 'GOOGLE',
        audience,
        codeVerifier: verifier,
        nonce,
        next: safeNext(next),
        expiresAt: new Date(this.ctx.now().getTime() + FLOW_TTL_MS),
      },
    });
    const domains = this.ctx.env.ADMIN_GOOGLE_ALLOWED_DOMAINS;
    const url = this.ctx.google.authorizationUrl({
      redirectUri: this.redirectUri(audience),
      state,
      codeChallenge: challenge,
      nonce,
      ...(audience === 'ADMIN' && domains.length === 1 ? { hostedDomain: domains[0] } : {}),
    });
    return { url, state };
  }

  /**
   * Completes a sign-in. `cookieState` must equal the `state` Google sent back, which proves the
   * same browser started this sign-in (prevents login CSRF). Each attempt can be used once.
   */
  async completeGoogle(
    audience: SessionAudience,
    q: { state?: string; code?: string; error?: string },
    cookieState: string | undefined,
    meta: RequestMeta,
  ) {
    if (q.error) throw new OAuthError('google_cancelled');
    if (!this.ctx.google || !q.state || !q.code || !cookieState || cookieState !== q.state) {
      throw new OAuthError('google_expired');
    }
    const attempt = await this.ctx.db.oAuthLoginAttempt.findUnique({
      where: { id: sha256Hex(q.state) },
    });
    if (attempt) await this.ctx.db.oAuthLoginAttempt.delete({ where: { id: attempt.id } });
    if (!attempt || attempt.audience !== audience || attempt.expiresAt <= this.ctx.now()) {
      throw new OAuthError('google_expired');
    }

    let identity: GoogleIdentity;
    try {
      identity = await this.ctx.google.exchange({
        code: q.code,
        codeVerifier: attempt.codeVerifier,
        redirectUri: this.redirectUri(audience),
        nonce: attempt.nonce,
      });
    } catch (err) {
      this.ctx.log.warn({ err }, 'google sign-in failed');
      throw new OAuthError('google_failed');
    }
    if (!identity.emailVerified) throw new OAuthError('google_unverified');

    const userId =
      audience === 'ADMIN'
        ? await this.resolveAdmin(identity, meta)
        : await this.resolveStudent(identity, meta);
    const session = await this.sessions.create(userId, audience, meta);
    await this.ctx.db.user.update({ where: { id: userId }, data: { lastLoginAt: this.ctx.now() } });
    return { ...session, next: attempt.next };
  }

  private async findLinked(identity: GoogleIdentity) {
    const link = await this.ctx.db.userIdentity.findUnique({
      where: { provider_providerUserId: { provider: 'GOOGLE', providerUserId: identity.sub } },
      include: { user: true },
    });
    if (link) {
      await this.ctx.db.userIdentity.update({
        where: { id: link.id },
        data: { lastUsedAt: this.ctx.now(), email: identity.email },
      });
      return link.user;
    }
    return null;
  }

  private async link(userId: string, identity: GoogleIdentity) {
    await this.ctx.db.userIdentity.create({
      data: { userId, provider: 'GOOGLE', providerUserId: identity.sub, email: identity.email },
    });
  }

  private async resolveStudent(identity: GoogleIdentity, meta: RequestMeta): Promise<string> {
    let user =
      (await this.findLinked(identity)) ??
      (await this.ctx.db.user.findUnique({ where: { email: identity.email } }));

    if (user) {
      if (user.role !== 'STUDENT') throw new OAuthError('not_student');
      if (user.status === 'SUSPENDED' || user.status === 'DELETED')
        throw new OAuthError('suspended');
      if (
        !(await this.ctx.db.userIdentity.findFirst({
          where: { userId: user.id, provider: 'GOOGLE' },
        }))
      ) {
        await this.link(user.id, identity);
      }
      if (!user.emailVerifiedAt) {
        await this.ctx.db.user.update({
          where: { id: user.id },
          data: { emailVerifiedAt: this.ctx.now() },
        });
      }
      return user.id;
    }

    // New student: same sign-up policy as email/password registration.
    const [policy, entry] = await Promise.all([
      this.settings.getRegistrationPolicy(),
      this.settings.matchAllowlist(identity.email),
    ]);
    if (policy === 'INVITE_ONLY' || (policy === 'ALLOWLIST' && !entry))
      throw new OAuthError('registration_closed');

    user = await this.ctx.db.user.create({
      data: {
        email: identity.email,
        role: 'STUDENT',
        emailVerifiedAt: this.ctx.now(),
        studentProfile: {
          create: { fullName: (identity.name ?? identity.email.split('@')[0] ?? '').slice(0, 80) },
        },
        identities: {
          create: { provider: 'GOOGLE', providerUserId: identity.sub, email: identity.email },
        },
        ...(entry?.cohortId ? { cohorts: { create: { cohortId: entry.cohortId } } } : {}),
      },
    });
    if (entry?.email) {
      await this.ctx.db.enrollmentAllowlist.updateMany({
        where: { id: entry.id, usedAt: null },
        data: { usedAt: this.ctx.now() },
      });
    }
    await this.audit.record({
      actorId: user.id,
      action: 'student.registered',
      entityType: 'user',
      entityId: user.id,
      after: { method: 'google' },
      ip: meta.ip,
    });
    return user.id;
  }

  /** Admins are never created by Google sign-in: the account must already exist (invited). */
  private async resolveAdmin(identity: GoogleIdentity, meta: RequestMeta): Promise<string> {
    const domains = this.ctx.env.ADMIN_GOOGLE_ALLOWED_DOMAINS;
    const domain = identity.email.split('@')[1] ?? '';
    if (domains.length > 0 && !domains.includes(domain)) throw new OAuthError('domain_not_allowed');

    const user =
      (await this.findLinked(identity)) ??
      (await this.ctx.db.user.findUnique({ where: { email: identity.email } }));
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      await this.audit.record({
        actorId: null,
        action: 'admin.google_login_rejected',
        after: { email: identity.email },
        ip: meta.ip,
      });
      throw new OAuthError('not_admin');
    }
    if (user.status === 'SUSPENDED' || user.status === 'DELETED') throw new OAuthError('suspended');

    if (user.status === 'INVITED') {
      // Signing in with the invited Google account accepts the invite.
      await this.ctx.db.$transaction([
        this.ctx.db.user.update({
          where: { id: user.id },
          data: {
            status: 'ACTIVE',
            emailVerifiedAt: this.ctx.now(),
            adminProfile: {
              upsert: {
                create: { fullName: identity.name },
                update: { fullName: identity.name ?? undefined },
              },
            },
          },
        }),
        this.ctx.db.authToken.updateMany({
          where: { userId: user.id, type: 'ADMIN_INVITE', usedAt: null },
          data: { usedAt: this.ctx.now() },
        }),
      ]);
    }
    if (
      !(await this.ctx.db.userIdentity.findFirst({
        where: { userId: user.id, provider: 'GOOGLE' },
      }))
    ) {
      await this.link(user.id, identity);
    }
    await this.audit.record({
      actorId: user.id,
      action: 'admin.login',
      entityType: 'user',
      entityId: user.id,
      after: { method: 'google' },
      ip: meta.ip,
    });
    return user.id;
  }

  /** Used by the daily maintenance job. */
  purgeExpired() {
    return this.ctx.db.oAuthLoginAttempt.deleteMany({
      where: { expiresAt: { lt: this.ctx.now() } },
    });
  }
}
