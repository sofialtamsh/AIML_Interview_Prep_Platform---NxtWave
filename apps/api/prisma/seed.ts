/**
 * Development seed: the catalog + pilot curriculum bootstrap (same as production), the local super admin
 * (SEED_SUPER_ADMIN_*) and a ready-made demo student with a goal (SEED_DEMO_STUDENT_*).
 * Refuses to run in production. Safe to re-run: existing accounts are left as they are.
 */
import { createAppContext } from '../src/bootstrap.ts';
import { toDbDate, todayIn } from '../src/lib/dates.ts';
import { hashPassword } from '../src/lib/password.ts';
import { bootstrapAiConfig } from '../src/modules/ai/models.ts';
import { bootstrapCatalog } from '../src/modules/catalog/catalog.bootstrap.ts';
import { bootstrapExemplarLessons } from '../src/modules/content/exemplars/bootstrap.ts';
import { bootstrapPilotCurriculum } from '../src/modules/curriculum/pilot-curriculum.ts';
import { RoadmapService } from '../src/modules/roadmap/roadmap.service.ts';

const ctx = createAppContext('seed');

if (ctx.env.NODE_ENV === 'production') {
  console.error('Refusing to run the development seed in production.');
  process.exit(1);
}

const env = (k: string) => process.env[k]?.trim() || undefined;

async function seedAdmin() {
  const email = env('SEED_SUPER_ADMIN_EMAIL')?.toLowerCase();
  const password = env('SEED_SUPER_ADMIN_PASSWORD');
  if (!email || !password) return console.log('• SEED_SUPER_ADMIN_* not set, skipping admin');
  if (await ctx.db.user.findUnique({ where: { email } }))
    return console.log(`• admin ${email} exists`);
  await ctx.db.user.create({
    data: {
      email,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      passwordHash: await hashPassword(password),
      adminProfile: { create: { fullName: 'Demo Admin' } },
    },
  });
  console.log(`✓ created demo super admin ${email}`);
}

async function seedStudent() {
  const email = env('SEED_DEMO_STUDENT_EMAIL')?.toLowerCase();
  const password = env('SEED_DEMO_STUDENT_PASSWORD');
  if (!email || !password) return console.log('• SEED_DEMO_STUDENT_* not set, skipping student');
  if (await ctx.db.user.findUnique({ where: { email } }))
    return console.log(`• student ${email} exists`);

  const [role, bracket] = await Promise.all([
    ctx.db.careerRole.findUniqueOrThrow({
      where: { slug: 'ai-engineer' },
      include: { skillAreas: true },
    }),
    ctx.db.packageBracket.findUniqueOrThrow({ where: { code: 'LPA_8_12' } }),
  ]);
  const today = todayIn('Asia/Kolkata', new Date());
  const deadline = new Date(Date.parse(`${today}T00:00:00Z`) + 75 * 86_400_000);
  const levels = [2, 1, 1, 0, 1, 0];

  const student = await ctx.db.user.create({
    data: {
      email,
      role: 'STUDENT',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      passwordHash: await hashPassword(password),
      studentProfile: {
        create: { fullName: 'Demo Student', onboardingCompletedAt: new Date(), onboardingStep: 4 },
      },
      goals: {
        create: {
          roleId: role.id,
          bracketId: bracket.id,
          dailyMinutes: 90,
          studyWeekdays: [1, 2, 3, 4, 5, 6],
          startDate: toDbDate(today),
          deadline,
        },
      },
      skillRatings: {
        create: [...role.skillAreas]
          .sort((a, b) => b.importance - a.importance)
          .map((s, i) => ({ skillAreaId: s.skillAreaId, level: levels[i] ?? 0 })),
      },
    },
  });
  const goal = await ctx.db.studentGoal.findFirstOrThrow({ where: { studentId: student.id } });
  await new RoadmapService(ctx).ensureForGoal(goal.id);
  console.log(`✓ created demo student ${email} (AI Engineer · 8–12 LPA) with a roadmap`);
}

try {
  console.log('✓ catalog bootstrap', await bootstrapCatalog(ctx.db));
  console.log('✓ pilot curriculum', await bootstrapPilotCurriculum(ctx.db));
  console.log('✓ reference lessons (under review)', await bootstrapExemplarLessons(ctx.db));
  console.log('✓ AI model routes and prices', await bootstrapAiConfig(ctx.db));
  await seedAdmin();
  await seedStudent();
} finally {
  await ctx.db.$disconnect();
}
