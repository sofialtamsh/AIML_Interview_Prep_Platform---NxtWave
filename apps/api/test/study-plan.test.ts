import type {
  AdminStudyPlanResponse,
  GoalResponse,
  OnboardingPlanPreviewResponse,
  RoadmapResponse,
  SaveStudyPlanResponse,
  StudentStudyPlan,
  StudyPlanPreviewResponse,
  TopicPageResponse,
} from '@app/contracts';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ADMIN_ORIGIN,
  browser,
  createAdmin,
  createTestApp,
  errorCode,
  json,
  resetWithCatalog,
  STUDENT_ORIGIN,
  testClock,
  testDb,
} from './helpers.ts';

// Monday 2026-11-02, 09:30 in Asia/Kolkata.
const clock = testClock(new Date('2026-11-02T04:00:00Z'));
const { app } = await createTestApp({ now: clock.now });
afterAll(async () => {
  await app.close();
});

let ids: Awaited<ReturnType<typeof resetWithCatalog>>;
beforeEach(async () => {
  ids = await resetWithCatalog();
});

const MON_SAT = [1, 2, 3, 4, 5, 6];
let n = 0;

async function admin() {
  const creds = await createAdmin(`lead${++n}@nxtwave.co.in`, 'Content-Lead-2026', 'ADMIN');
  const b = browser(app, ADMIN_ORIGIN, clock.now);
  await b.post('/api/v1/admin/auth/login', creds);
  return b;
}

async function registered() {
  const b = browser(app, STUDENT_ORIGIN, clock.now);
  const email = `plan${++n}@student.test`;
  const res = await b.post('/api/v1/auth/register', {
    email,
    password: 'Learn-RAG-2026',
    fullName: 'Plan Student',
  });
  expect(res.statusCode).toBe(201);
  const user = await testDb().user.findUniqueOrThrow({ where: { email } });
  return Object.assign(b, { id: user.id });
}

/** A student who picked their own package and time (the behaviour before any plan is saved). */
async function selfPlanned(bracket = 'LPA_8_12') {
  const b = await registered();
  const res = await b.post('/api/v1/student/onboarding/complete', {
    roleId: ids.role('ai-engineer'),
    bracketId: ids.bracket(bracket),
    skills: {},
    schedule: { dailyMinutes: 60, studyWeekdays: MON_SAT, deadline: null },
  });
  expect(res.statusCode).toBe(200);
  return b;
}

/** The pilot shape: the team decides time and package; 30 days from each student's start. */
const teamPlan = (over: Record<string, unknown> = {}) => ({
  dailyMinutes: 45,
  studyWeekdays: [1, 2, 3, 4, 5],
  deadline: { mode: 'DAYS_AFTER_START', days: 30 },
  message: '  Give this 45 minutes every weekday.  ',
  bracketId: ids.bracket('LPA_3_6'),
  studentsChooseSchedule: false,
  studentsChoosePackage: false,
  applyToStudents: true,
  ...over,
});

const activeGoal = (studentId: string) =>
  testDb().studentGoal.findFirstOrThrow({
    where: { studentId, isActive: true },
    include: { bracket: true },
  });

describe('study plan: defaults', () => {
  it('lets students choose their own time and package until a plan is saved', async () => {
    const s = await registered();
    expect(json<StudentStudyPlan>(await s.get('/api/v1/student/study-plan'))).toMatchObject({
      studentsChooseSchedule: true,
      studentsChoosePackage: true,
      message: null,
      deadlineIfStartedToday: null,
      updatedAt: null,
    });
    const view = json<AdminStudyPlanResponse>(
      await (await admin()).get('/api/v1/admin/study-plan'),
    );
    expect(view.updatedAt).toBeNull();
    expect(view.role?.title).toBe('AI Engineer');
    expect(view.brackets.map((b) => b.label)).toEqual(['3–6 LPA', '8–12 LPA']);
    expect(view.brackets.every((b) => (b.totalMinutes ?? 0) > 0)).toBe(true);
    // The deeper package needs more study time.
    expect(view.brackets[1]?.totalMinutes ?? 0).toBeGreaterThan(
      view.brackets[0]?.totalMinutes ?? 0,
    );
    expect(view.effectiveBracketId).toBe(ids.bracket('LPA_3_6'));
  });

  it('still asks for package and time while students choose them', async () => {
    const s = await registered();
    const noPackage = await s.post('/api/v1/student/onboarding/complete', {
      roleId: ids.role('ai-engineer'),
      skills: {},
      schedule: { dailyMinutes: 60, studyWeekdays: MON_SAT, deadline: null },
    });
    expect(noPackage.statusCode).toBe(400);
    expect(
      json<{ error: { details: { fields: object } } }>(noPackage).error.details.fields,
    ).toHaveProperty('bracketId');
    const noTime = await s.post('/api/v1/student/onboarding/complete', {
      roleId: ids.role('ai-engineer'),
      bracketId: ids.bracket('LPA_3_6'),
      skills: {},
    });
    expect(noTime.statusCode).toBe(400);
  });
});

describe('study plan: the team decides', () => {
  it('onboards students onto the plan with no package or time to pick', async () => {
    const a = await admin();
    const saved = await a.put('/api/v1/admin/study-plan', teamPlan());
    expect(saved.statusCode).toBe(200);
    expect(json<SaveStudyPlanResponse>(saved).plan.message).toBe(
      'Give this 45 minutes every weekday.',
    );

    const s = await registered();
    expect(json<StudentStudyPlan>(await s.get('/api/v1/student/study-plan'))).toMatchObject({
      dailyMinutes: 45,
      studyWeekdays: [1, 2, 3, 4, 5],
      deadlineIfStartedToday: '2026-12-02',
      studentsChooseSchedule: false,
      studentsChoosePackage: false,
    });

    // The onboarding preview works without a package or schedule.
    const preview = json<OnboardingPlanPreviewResponse>(
      await s.post('/api/v1/student/onboarding/plan-preview', {
        roleId: ids.role('ai-engineer'),
        skills: {},
      }),
    );
    expect(preview.preview?.proposed.weeklyMinutes).toBe(225);

    // A student-sent package or time is ignored: the plan applies.
    const done = await s.post('/api/v1/student/onboarding/complete', {
      roleId: ids.role('ai-engineer'),
      bracketId: ids.bracket('LPA_8_12'),
      skills: {},
      schedule: { dailyMinutes: 300, studyWeekdays: [0], deadline: null },
    });
    expect(done.statusCode).toBe(200);
    const goal = json<GoalResponse>(done).goal;
    expect(goal).toMatchObject({
      bracket: { code: 'LPA_3_6' },
      dailyMinutes: 45,
      studyWeekdays: [1, 2, 3, 4, 5],
      startDate: '2026-11-02',
      deadline: '2026-12-02',
      daysToDeadline: 30,
    });
    expect(json<RoadmapResponse>(await s.get('/api/v1/student/roadmap')).status).toBe('READY');

    // Students can't change the team's time.
    const change = await s.put('/api/v1/student/goal/schedule', {
      dailyMinutes: 120,
      studyWeekdays: MON_SAT,
      deadline: null,
    });
    expect(change.statusCode).toBe(403);
    expect(errorCode(change)).toBe('FORBIDDEN');
  });

  it('brings current students in line when applied, keeping their history', async () => {
    const s1 = await selfPlanned('LPA_8_12');
    const s2 = await selfPlanned('LPA_3_6');
    const a = await admin();

    const first = json<SaveStudyPlanResponse>(await a.put('/api/v1/admin/study-plan', teamPlan()));
    // s1 moves to the plan's package (a new goal), s2 only gets the plan's time.
    expect(first.applied).toEqual({ updated: 1, movedPackage: 1 });
    for (const s of [s1, s2]) {
      const g = await activeGoal(s.id);
      expect(g.bracket.code).toBe('LPA_3_6');
      expect(g.dailyMinutes).toBe(45);
      expect(g.studyWeekdays).toEqual([1, 2, 3, 4, 5]);
      expect(g.deadline?.toISOString().slice(0, 10)).toBe('2026-12-02');
      expect(json<RoadmapResponse>(await s.get('/api/v1/student/roadmap')).status).toBe('READY');
    }
    expect(await testDb().studentGoal.count({ where: { studentId: s1.id } })).toBe(2);
    const r2 = json<RoadmapResponse>(await s2.get('/api/v1/student/roadmap'));
    expect(r2.roadmap?.version.trigger).toBe('SETTINGS_CHANGE');
    expect(r2.roadmap?.totals.weeklyMinutes).toBe(225);

    const again = json<SaveStudyPlanResponse>(
      await a.put('/api/v1/admin/study-plan', teamPlan({ dailyMinutes: 60 })),
    );
    expect(again.applied).toEqual({ updated: 2, movedPackage: 0 });
    const same = json<SaveStudyPlanResponse>(
      await a.put('/api/v1/admin/study-plan', teamPlan({ dailyMinutes: 60 })),
    );
    expect(same.applied).toEqual({ updated: 0, movedPackage: 0 });
    // Saving without applying leaves current goals alone.
    const quiet = json<SaveStudyPlanResponse>(
      await a.put(
        '/api/v1/admin/study-plan',
        teamPlan({ dailyMinutes: 90, applyToStudents: false }),
      ),
    );
    expect(quiet.applied).toBeNull();
    expect((await activeGoal(s1.id)).dailyMinutes).toBe(60);
    expect(
      await testDb().auditLog.count({ where: { action: { startsWith: 'study_plan.' } } }),
    ).toBeGreaterThanOrEqual(6);
  });

  it('keeps the package out of student-facing text', async () => {
    await (await admin()).put('/api/v1/admin/study-plan', teamPlan());
    const s = await registered();
    await s.post('/api/v1/student/onboarding/complete', {
      roleId: ids.role('ai-engineer'),
      skills: {},
    });
    const topic = json<TopicPageResponse>(await s.get('/api/v1/student/topics/python-numpy'));
    expect(topic.depthNote).toContain('For AI Engineer interviews');
    expect(topic.depthNote).not.toContain('LPA');
    const ics = await s.get('/api/v1/student/roadmap/calendar.ics');
    expect(ics.body).toContain('NxtWave Prep · AI Engineer');
    expect(ics.body).not.toContain('LPA');
  });

  it('switching a role keeps the plan package and the original start date', async () => {
    await testDb().careerRole.update({
      where: { id: ids.role('ml-engineer') },
      data: { availability: 'LIVE' },
    });
    await (await admin()).put('/api/v1/admin/study-plan', teamPlan());
    const s = await registered();
    await s.post('/api/v1/student/onboarding/complete', {
      roleId: ids.role('ai-engineer'),
      skills: {},
    });
    clock.advance(3 * 86_400_000);
    try {
      const res = await s.post('/api/v1/student/goal/target', { roleId: ids.role('ml-engineer') });
      expect(res.statusCode).toBe(200);
      expect(json<GoalResponse>(res).goal).toMatchObject({
        role: { slug: 'ml-engineer' },
        bracket: { code: 'LPA_3_6' },
        startDate: '2026-11-02',
        deadline: '2026-12-02',
      });
    } finally {
      clock.advance(-3 * 86_400_000);
    }
  });
});

describe('study plan: admin checks', () => {
  it('refuses closed packages, past dates and packages without a curriculum', async () => {
    const a = await admin();
    const closed = await a.put(
      '/api/v1/admin/study-plan',
      teamPlan({ bracketId: ids.bracket('LPA_6_8') }),
    );
    expect(closed.statusCode).toBe(400);
    const past = await a.put(
      '/api/v1/admin/study-plan',
      teamPlan({ deadline: { mode: 'DATE', date: '2026-11-01' } }),
    );
    expect(past.statusCode).toBe(400);
    const tooShort = await a.put(
      '/api/v1/admin/study-plan',
      teamPlan({ deadline: { mode: 'DAYS_AFTER_START', days: 3 } }),
    );
    expect(tooShort.statusCode).toBe(400);

    const empty = await testDb().packageBracket.create({
      data: {
        code: 'LPA_20_PLUS',
        label: '20+ LPA',
        minLpa: 20,
        maxLpa: null,
        headline: 'Staff level',
        expectations: 'Deep system design and leadership.',
        availability: 'LIVE',
        sortOrder: 9,
      },
    });
    const noCurriculum = await a.put('/api/v1/admin/study-plan', teamPlan({ bracketId: empty.id }));
    expect(noCurriculum.statusCode).toBe(400);
    expect(json<{ error: { message: string } }>(noCurriculum).error.message).toMatch(
      /no published curriculum/,
    );
    // While students pick their package, any open package is fine as the default.
    const choose = await a.put(
      '/api/v1/admin/study-plan',
      teamPlan({ bracketId: empty.id, studentsChoosePackage: true }),
    );
    expect(choose.statusCode).toBe(200);
  });

  it('previews how the plan plays out against the deadline', async () => {
    const a = await admin();
    const tight = json<StudyPlanPreviewResponse>(
      await a.post('/api/v1/admin/study-plan/preview', {
        dailyMinutes: 30,
        studyWeekdays: [1, 3, 5],
        deadline: { mode: 'DATE', date: '2026-11-12' },
        bracketId: ids.bracket('LPA_8_12'),
      }),
    );
    expect(tight.preview?.feasibility?.feasible).toBe(false);
    expect(tight.preview?.proposed.startDate).toBe('2026-11-02');

    const open = json<StudyPlanPreviewResponse>(
      await a.post('/api/v1/admin/study-plan/preview', {
        dailyMinutes: 60,
        studyWeekdays: MON_SAT,
        deadline: { mode: 'NONE' },
        bracketId: null,
      }),
    );
    expect(open.preview?.feasibility).toBeNull();
    expect(open.preview?.proposed.plannedEndDate).toBeTruthy();
    expect(open.preview?.proposed.weeklyMinutes).toBe(360);
  });
});
