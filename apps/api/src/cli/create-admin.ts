/**
 * Creates the first (or another) admin account. There is no public admin sign-up.
 *
 *   pnpm admin:create --email you@nxtwave.co.in [--role SUPER_ADMIN|ADMIN] [--name "Full Name"] [--password "..."]
 *
 * Without --password an invite link is printed (and emailed); the admin sets their own password.
 * With --password the account is activated immediately (handy for local development).
 */
import { parseArgs } from 'node:util';
import { Email, Password } from '@app/contracts';
import { createAppContext } from '../bootstrap.ts';
import { hashPassword } from '../lib/password.ts';
import { AuthService } from '../modules/auth/auth.service.ts';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    role: { type: 'string', default: 'SUPER_ADMIN' },
    name: { type: 'string' },
    password: { type: 'string' },
  },
});

const email = Email.safeParse(values.email);
if (!email.success) {
  console.error(
    'Usage: pnpm admin:create --email you@example.com [--role SUPER_ADMIN|ADMIN] [--name ..] [--password ..]',
  );
  process.exit(1);
}
const role = values.role === 'ADMIN' ? 'ADMIN' : 'SUPER_ADMIN';
const ctx = createAppContext('cli');

try {
  if (values.password) {
    const pw = Password.safeParse(values.password);
    if (!pw.success) throw new Error(pw.error.issues[0]?.message ?? 'Invalid password');
    const existing = await ctx.db.user.findUnique({ where: { email: email.data } });
    if (existing) throw new Error('An account with this email already exists.');
    await ctx.db.user.create({
      data: {
        email: email.data,
        role,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        passwordHash: await hashPassword(pw.data),
        adminProfile: { create: { fullName: values.name ?? null } },
      },
    });
    console.log(`✓ ${role} ${email.data} created. Sign in at ${ctx.env.ADMIN_APP_URL}/login`);
  } else {
    const auth = new AuthService(ctx);
    const invite = await auth.inviteAdmin(
      email.data,
      role,
      { id: null, name: 'The platform team' },
      {
        ip: null,
        userAgent: 'cli',
      },
    );
    console.log(
      `✓ Invite created for ${email.data} (${role}). Expires ${invite.expiresAt.toISOString()}`,
    );
    console.log(`  ${invite.inviteUrl}`);
  }
} catch (err) {
  console.error(`✗ ${(err as Error).message}`);
  process.exitCode = 1;
} finally {
  await ctx.db.$disconnect();
}
