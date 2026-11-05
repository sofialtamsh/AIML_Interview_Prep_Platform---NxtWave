import { RegistrationPolicy } from '@app/contracts';
import type { AppContext } from '../../context.ts';

const KEYS = {
  registrationPolicy: 'registration.policy',
} as const;

/** Runtime platform settings stored in the DB, falling back to env defaults. */
export class SettingsService {
  constructor(private readonly ctx: AppContext) {}

  async getRegistrationPolicy(): Promise<RegistrationPolicy> {
    const row = await this.ctx.db.platformSetting.findUnique({
      where: { key: KEYS.registrationPolicy },
    });
    const parsed = RegistrationPolicy.safeParse(row?.value);
    return parsed.success ? parsed.data : this.ctx.env.REGISTRATION_POLICY_DEFAULT;
  }

  async setRegistrationPolicy(policy: RegistrationPolicy, updatedById: string): Promise<void> {
    await this.ctx.db.platformSetting.upsert({
      where: { key: KEYS.registrationPolicy },
      create: { key: KEYS.registrationPolicy, value: policy, updatedById },
      update: { value: policy, updatedById },
    });
  }

  /** The allowlist entry that admits this email: an exact email entry wins over a domain entry. */
  async matchAllowlist(email: string) {
    const domain = email.split('@')[1] ?? '';
    const [exact, byDomain] = await Promise.all([
      this.ctx.db.enrollmentAllowlist.findUnique({ where: { email } }),
      domain ? this.ctx.db.enrollmentAllowlist.findUnique({ where: { domain } }) : null,
    ]);
    return exact ?? byDomain;
  }
}
