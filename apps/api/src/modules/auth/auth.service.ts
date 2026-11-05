import type {
  AcceptInviteBody,
  AdminMe,
  ChangePasswordBody,
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
  StudentMe,
} from '@app/contracts';
import type { AppContext, RequestMeta } from '../../context.ts';
import type { SessionAudience, UserRole } from '../../generated/prisma/enums.ts';
import { AppError } from '../../lib/errors.ts';
import { burnPasswordCheck, hashPassword, verifyPassword } from '../../lib/password.ts';
import { emails } from '../../mail/templates.ts';
import { AuditService } from '../audit/audit.service.ts';
import { SettingsService } from '../settings/settings.service.ts';
import { SessionService, type SessionUser } from './session.service.ts';
import { TokenService } from './token.service.ts';

const INVALID_LOGIN = 'Email or password is incorrect.';
const ADMIN_ROLES: readonly UserRole[] = ['ADMIN', 'SUPER_ADMIN'];

export function toStudentMe(user: SessionUser): StudentMe {
  return {
    id: user.id,
    email: user.email,
    fullName: user.studentProfile?.fullName ?? '',
    timezone: user.studentProfile?.timezone ?? 'Asia/Kolkata',
    emailVerified: user.emailVerifiedAt !== null,
    onboardingCompleted: user.studentProfile?.onboardingCompletedAt != null,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toAdminMe(user: SessionUser): AdminMe {
  return {
    id: user.id,
    email: user.email,
    fullName: user.adminProfile?.fullName ?? user.email,
    role: user.role,
  };
}

export class AuthService {
  readonly sessions: SessionService;
  private readonly tokens: TokenService;
  private readonly audit: AuditService;
  private readonly settings: SettingsService;

  constructor(private readonly ctx: AppContext) {
    this.sessions = new SessionService(ctx);
    this.tokens = new TokenService(ctx);
    this.audit = new AuditService(ctx);
    this.settings = new SettingsService(ctx);
  }

  // ─────────────── Student registration & verification ───────────────

  async registerStudent(input: RegisterBody, meta: RequestMeta) {
    const entry = await this.assertRegistrationAllowed(input.email);

    const existing = await this.ctx.db.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError(
        'EMAIL_TAKEN',
        'That email is already registered. Try signing in instead.',
      );
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.ctx.db.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: 'STUDENT',
        studentProfile: { create: { fullName: input.fullName } },
        // Enrolled through a cohort's list (email or domain): join that cohort automatically.
        ...(entry?.cohortId ? { cohorts: { create: { cohortId: entry.cohortId } } } : {}),
      },
    });
    if (entry?.email) {
      await this.ctx.db.enrollmentAllowlist.updateMany({
        where: { id: entry.id, usedAt: null },
        data: { usedAt: this.ctx.now() },
      });
    }

    await this.sendVerificationEmail(user.id, user.email, input.fullName);
    const session = await this.sessions.create(user.id, 'STUDENT', meta);
    await this.audit.record({
      actorId: user.id,
      action: 'student.registered',
      entityType: 'user',
      entityId: user.id,
      ip: meta.ip,
    });
    return { ...session, userId: user.id };
  }

  /** Returns the matching allowlist entry (if any) so registration can apply its cohort. */
  private async assertRegistrationAllowed(email: string) {
    const [policy, entry] = await Promise.all([
      this.settings.getRegistrationPolicy(),
      this.settings.matchAllowlist(email),
    ]);
    if (policy === 'OPEN') return entry;
    if (policy === 'ALLOWLIST' && entry) return entry;
    throw new AppError(
      'REGISTRATION_CLOSED',
      policy === 'ALLOWLIST'
        ? 'This email is not on the enrolled students list. Use the email you enrolled with, or contact your program coordinator.'
        : 'Sign-up is by invitation only. Contact your program coordinator.',
    );
  }

  private async sendVerificationEmail(userId: string, email: string, name: string) {
    const { token } = await this.tokens.issue(userId, 'EMAIL_VERIFICATION');
    const url = `${this.ctx.env.STUDENT_APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
    await this.safeSend(emails.verification(this.ctx.env.APP_NAME, email, name, url));
  }

  async resendVerification(user: SessionUser): Promise<void> {
    if (user.emailVerifiedAt) return;
    await this.sendVerificationEmail(user.id, user.email, user.studentProfile?.fullName ?? 'there');
  }

  async verifyEmail(token: string): Promise<void> {
    const { userId } = await this.tokens.consume(token, 'EMAIL_VERIFICATION');
    await this.ctx.db.user.updateMany({
      where: { id: userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: this.ctx.now() },
    });
  }

  // ─────────────── Login / logout (both audiences) ───────────────

  async login(audience: SessionAudience, input: LoginBody, meta: RequestMeta) {
    const user = await this.ctx.db.user.findUnique({ where: { email: input.email } });
    if (!user?.passwordHash) {
      await burnPasswordCheck(input.password);
      throw new AppError('INVALID_CREDENTIALS', INVALID_LOGIN);
    }
    const passwordOk = await verifyPassword(user.passwordHash, input.password);
    const roleOk = audience === 'ADMIN' ? ADMIN_ROLES.includes(user.role) : user.role === 'STUDENT';

    if (!passwordOk || !roleOk) {
      if (audience === 'ADMIN') {
        await this.audit.record({
          actorId: user.id,
          action: 'admin.login_failed',
          entityType: 'user',
          entityId: user.id,
          ip: meta.ip,
        });
      }
      throw new AppError('INVALID_CREDENTIALS', INVALID_LOGIN);
    }
    if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
      throw new AppError(
        'ACCOUNT_SUSPENDED',
        'This account is not active. Contact your program coordinator.',
      );
    }
    if (user.status !== 'ACTIVE') throw new AppError('INVALID_CREDENTIALS', INVALID_LOGIN);

    const session = await this.sessions.create(user.id, audience, meta);
    await this.ctx.db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: this.ctx.now() },
    });
    if (audience === 'ADMIN') {
      await this.audit.record({
        actorId: user.id,
        action: 'admin.login',
        entityType: 'user',
        entityId: user.id,
        ip: meta.ip,
      });
    }
    return { ...session, userId: user.id };
  }

  logout(token: string): Promise<void> {
    return this.sessions.revokeByToken(token);
  }

  // ─────────────── Password reset & change ───────────────

  /** Always resolves (no account enumeration). Sends a link only to eligible accounts. */
  async requestPasswordReset(audience: SessionAudience, email: string): Promise<void> {
    const user = await this.ctx.db.user.findUnique({ where: { email } });
    const eligible =
      user &&
      user.status === 'ACTIVE' &&
      (audience === 'ADMIN' ? ADMIN_ROLES.includes(user.role) : user.role === 'STUDENT');
    if (!eligible) return;

    const { token } = await this.tokens.issue(user.id, 'PASSWORD_RESET');
    const base = audience === 'ADMIN' ? this.ctx.env.ADMIN_APP_URL : this.ctx.env.STUDENT_APP_URL;
    const url = `${base}/reset-password?token=${encodeURIComponent(token)}`;
    await this.safeSend(emails.passwordReset(this.ctx.env.APP_NAME, user.email, url));
  }

  async resetPassword(input: ResetPasswordBody, meta: RequestMeta): Promise<void> {
    const { userId } = await this.tokens.consume(input.token, 'PASSWORD_RESET');
    const current = await this.ctx.db.user.findUniqueOrThrow({ where: { id: userId } });
    const user = await this.ctx.db.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(input.password),
        // Clicking the emailed link proves ownership of the address.
        emailVerifiedAt: current.emailVerifiedAt ?? this.ctx.now(),
      },
    });
    await this.sessions.revokeAllForUser(userId);
    await this.audit.record({
      actorId: userId,
      action: 'user.password_reset',
      entityType: 'user',
      entityId: userId,
      ip: meta.ip,
    });
    await this.safeSend(emails.passwordChanged(this.ctx.env.APP_NAME, user.email));
  }

  async changePassword(
    user: SessionUser,
    currentSessionId: string,
    input: ChangePasswordBody,
    meta: RequestMeta,
  ): Promise<void> {
    if (!user.passwordHash || !(await verifyPassword(user.passwordHash, input.currentPassword))) {
      throw new AppError('VALIDATION_ERROR', 'Your current password is not correct.', {
        fields: { currentPassword: 'Your current password is not correct.' },
      });
    }
    await this.ctx.db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.newPassword) },
    });
    await this.sessions.revokeAllForUser(user.id, currentSessionId);
    await this.audit.record({
      actorId: user.id,
      action: 'user.password_changed',
      entityType: 'user',
      entityId: user.id,
      ip: meta.ip,
    });
    await this.safeSend(emails.passwordChanged(this.ctx.env.APP_NAME, user.email));
  }

  // ─────────────── Admin invites ───────────────

  async inviteAdmin(
    email: string,
    role: 'ADMIN' | 'SUPER_ADMIN',
    inviter: { id: string | null; name: string },
    meta: RequestMeta,
  ) {
    const existing = await this.ctx.db.user.findUnique({ where: { email } });
    if (existing && existing.status !== 'INVITED') {
      throw new AppError('CONFLICT', 'An account with this email already exists.');
    }
    if (existing && existing.role === 'STUDENT') {
      throw new AppError('CONFLICT', 'A student account already uses this email.');
    }
    const user = existing
      ? await this.ctx.db.user.update({ where: { id: existing.id }, data: { role } })
      : await this.ctx.db.user.create({
          data: {
            email,
            role,
            status: 'INVITED',
            adminProfile: { create: { invitedById: inviter.id } },
          },
        });

    const { token, expiresAt } = await this.tokens.issue(user.id, 'ADMIN_INVITE');
    const inviteUrl = `${this.ctx.env.ADMIN_APP_URL}/accept-invite?token=${encodeURIComponent(token)}`;
    await this.safeSend(emails.adminInvite(this.ctx.env.APP_NAME, email, inviter.name, inviteUrl));
    await this.audit.record({
      actorId: inviter.id,
      action: 'admin.invited',
      entityType: 'user',
      entityId: user.id,
      after: { email, role },
      ip: meta.ip,
    });
    return { id: user.id, email, inviteUrl, expiresAt };
  }

  async acceptInvite(input: AcceptInviteBody, meta: RequestMeta) {
    const { userId } = await this.tokens.consume(input.token, 'ADMIN_INVITE');
    const now = this.ctx.now();
    const user = await this.ctx.db.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(input.password),
        status: 'ACTIVE',
        emailVerifiedAt: now,
        adminProfile: {
          upsert: { create: { fullName: input.fullName }, update: { fullName: input.fullName } },
        },
      },
    });
    await this.audit.record({
      actorId: user.id,
      action: 'admin.invite_accepted',
      entityType: 'user',
      entityId: user.id,
      ip: meta.ip,
    });
    return { ...(await this.sessions.create(user.id, 'ADMIN', meta)), userId: user.id };
  }

  // ─────────────── helpers ───────────────

  /** Loads a user with profiles for building response DTOs. */
  loadUser(userId: string): Promise<SessionUser> {
    return this.ctx.db.user.findUniqueOrThrow({
      where: { id: userId },
      include: { studentProfile: true, adminProfile: true },
    });
  }

  /** Email problems must never fail the user's action; they can always ask for a resend. */
  private async safeSend(message: Parameters<AppContext['mailer']['send']>[0]): Promise<void> {
    try {
      await this.ctx.mailer.send(message);
    } catch (err) {
      this.ctx.log.error({ err, tag: message.tag }, 'failed to send email');
    }
  }
}
