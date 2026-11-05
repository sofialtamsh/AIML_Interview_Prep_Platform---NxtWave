import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  browser,
  createTestApp,
  errorCode,
  isoInDays,
  json,
  resetWithCatalog,
  STUDENT,
  STUDENT_ORIGIN,
  testDb,
} from './helpers.ts';

const { app } = await createTestApp();
afterAll(async () => {
  await app.close();
});

let ids: Awaited<ReturnType<typeof resetWithCatalog>>;
beforeEach(async () => {
  ids = await resetWithCatalog();
});

async function student() {
  const b = browser(app, STUDENT_ORIGIN);
  expect((await b.post('/api/v1/auth/register', STUDENT)).statusCode).toBe(201);
  return b;
}

const schedule = { dailyMinutes: 60, studyWeekdays: [1, 2, 3, 4, 5, 6], deadline: null };

function completeBody() {
  return {
    roleId: ids.role('ai-engineer'),
    bracketId: ids.bracket('LPA_8_12'),
    skills: { [ids.area('python')]: 2, [ids.area('genai')]: 0 },
    schedule,
  };
}

describe('student catalog', () => {
  it('shows live and upcoming options (not hidden ones) with notify-me flags', async () => {
    await testDb().careerRole.update({
      where: { slug: 'data-engineer' },
      data: { availability: 'HIDDEN' },
    });
    const b = await student();
    const cat = json<{
      roles: { slug: string; availability: string; notifyMe: boolean; skillAreas: unknown[] }[];
      brackets: { code: string; availability: string; difficultyPolicy?: unknown }[];
    }>(await b.get('/api/v1/student/catalog'));

    expect(cat.roles.map((r) => r.slug)).toEqual([
      'ai-engineer',
      'ml-engineer',
      'data-scientist',
      'data-analyst',
    ]);
    expect(cat.roles[0]).toMatchObject({ availability: 'LIVE', notifyMe: false });
    expect(cat.roles[0]?.skillAreas.length).toBeGreaterThan(3);
    expect(cat.brackets.filter((x) => x.availability === 'LIVE').map((x) => x.code)).toEqual([
      'LPA_3_6',
      'LPA_8_12',
    ]);
    // Internal practice configuration is not exposed to students.
    expect(cat.brackets[0]).not.toHaveProperty('difficultyPolicy');
  });

  it('notify-me is idempotent and reflected in the catalog', async () => {
    const b = await student();
    const body = { kind: 'ROLE', targetId: ids.role('ml-engineer'), notify: true };
    expect((await b.post('/api/v1/student/interest', body)).statusCode).toBe(200);
    expect((await b.post('/api/v1/student/interest', body)).statusCode).toBe(200);
    expect(await testDb().interestSignal.count()).toBe(1);

    const cat = json<{ roles: { slug: string; notifyMe: boolean }[] }>(
      await b.get('/api/v1/student/catalog'),
    );
    expect(cat.roles.find((r) => r.slug === 'ml-engineer')?.notifyMe).toBe(true);

    await b.post('/api/v1/student/interest', { ...body, notify: false });
    expect(await testDb().interestSignal.count()).toBe(0);
  });
});

describe('onboarding', () => {
  it('saves a draft so a refresh resumes where the student left off', async () => {
    const b = await student();
    await b.put('/api/v1/student/onboarding', { step: 1, roleId: ids.role('ai-engineer') });
    await b.put('/api/v1/student/onboarding', { step: 2, bracketId: ids.bracket('LPA_3_6') });
    const state = json<{ completed: boolean; draft: Record<string, unknown> }>(
      await b.get('/api/v1/student/onboarding'),
    );
    expect(state).toEqual({
      completed: false,
      draft: {
        step: 2,
        roleId: ids.role('ai-engineer'),
        bracketId: ids.bracket('LPA_3_6'),
        skills: {},
        schedule: {},
      },
    });
  });

  it('completing creates the goal and ratings, marks onboarding done and clears the draft', async () => {
    const b = await student();
    await b.put('/api/v1/student/onboarding', { step: 3, roleId: ids.role('ai-engineer') });
    const res = await b.post('/api/v1/student/onboarding/complete', {
      ...completeBody(),
      schedule: { ...schedule, deadline: isoInDays(60) },
    });
    expect(res.statusCode).toBe(200);
    const { goal, skills } = json<{
      goal: Record<string, unknown> & { role: { slug: string }; bracket: { label: string } };
      skills: { name: string; level: number; importance: number }[];
    }>(res);
    expect(goal.role.slug).toBe('ai-engineer');
    expect(goal.bracket.label).toBe('8–12 LPA');
    expect(goal).toMatchObject({ dailyMinutes: 60, weeklyMinutes: 360, daysToDeadline: 60 });
    // The role's skill areas come back, most important first, unrated ones at level 0.
    expect(skills[0]).toMatchObject({ importance: 3 });
    expect(skills.find((s) => s.name === 'Python programming')?.level).toBe(2);
    expect(skills.find((s) => s.name === 'Deep learning & NLP')?.level).toBe(0);

    const me = json<{ user: { onboardingCompleted: boolean } }>(await b.get('/api/v1/auth/me'));
    expect(me.user.onboardingCompleted).toBe(true);
    const profile = await testDb().studentProfile.findFirstOrThrow();
    expect(profile.onboardingDraft).toBeNull();

    const again = await b.post('/api/v1/student/onboarding/complete', completeBody());
    expect(errorCode(again)).toBe('CONFLICT');
  });

  it('only LIVE roles and packages can be chosen', async () => {
    const b = await student();
    const role = await b.post('/api/v1/student/onboarding/complete', {
      ...completeBody(),
      roleId: ids.role('ml-engineer'),
    });
    expect(role.statusCode).toBe(400);
    expect(
      json<{ error: { details: { fields: Record<string, string> } } }>(role).error.details.fields,
    ).toHaveProperty('roleId');

    const bracket = await b.post('/api/v1/student/onboarding/complete', {
      ...completeBody(),
      bracketId: ids.bracket('LPA_12_PLUS'),
    });
    expect(
      json<{ error: { details: { fields: Record<string, string> } } }>(bracket).error.details
        .fields,
    ).toHaveProperty('bracketId');
  });

  it('validates the schedule: minutes, days and a sensible deadline', async () => {
    const b = await student();
    const tooSoon = await b.post('/api/v1/student/onboarding/complete', {
      ...completeBody(),
      schedule: { ...schedule, deadline: isoInDays(3) },
    });
    expect(tooSoon.statusCode).toBe(400);

    const bad = await b.post('/api/v1/student/onboarding/complete', {
      ...completeBody(),
      schedule: { dailyMinutes: 7, studyWeekdays: [], deadline: null },
    });
    expect(
      Object.keys(
        json<{ error: { details: { fields: object } } }>(bad).error.details.fields,
      ).sort(),
    ).toEqual(['schedule.dailyMinutes', 'schedule.studyWeekdays']);
  });
});

describe('goal after onboarding', () => {
  async function onboarded() {
    const b = await student();
    expect((await b.post('/api/v1/student/onboarding/complete', completeBody())).statusCode).toBe(
      200,
    );
    return b;
  }

  it('the schedule can be changed', async () => {
    const b = await onboarded();
    const res = await b.put('/api/v1/student/goal/schedule', {
      dailyMinutes: 120,
      studyWeekdays: [0, 6],
      deadline: isoInDays(30),
    });
    expect(json<{ goal: Record<string, unknown> }>(res).goal).toMatchObject({
      dailyMinutes: 120,
      studyWeekdays: [0, 6],
      weeklyMinutes: 240,
      daysToDeadline: 30,
    });
  });

  it('changing the target starts a new goal and keeps the old one as history', async () => {
    const b = await onboarded();
    const res = await b.post('/api/v1/student/goal/target', {
      roleId: ids.role('ai-engineer'),
      bracketId: ids.bracket('LPA_3_6'),
    });
    expect(
      json<{ goal: { bracket: { code: string }; dailyMinutes: number } }>(res).goal,
    ).toMatchObject({
      bracket: { code: 'LPA_3_6' },
      dailyMinutes: 60,
    });
    const goals = await testDb().studentGoal.findMany({ orderBy: { createdAt: 'asc' } });
    expect(goals.map((g) => g.isActive)).toEqual([false, true]);
    expect(goals[0]?.endedAt).not.toBeNull();
  });

  it('the database itself refuses a second active goal', async () => {
    await onboarded();
    const g = await testDb().studentGoal.findFirstOrThrow();
    await expect(
      testDb().studentGoal.create({
        data: {
          studentId: g.studentId,
          roleId: g.roleId,
          bracketId: g.bracketId,
          dailyMinutes: 30,
          studyWeekdays: [1],
          startDate: g.startDate,
        },
      }),
    ).rejects.toThrow();
  });

  it('skill self-ratings can be updated', async () => {
    const b = await onboarded();
    const res = await b.put('/api/v1/student/skills', { skills: { [ids.area('genai')]: 3 } });
    expect(
      json<{ skills: { name: string; level: number }[] }>(res).skills.find(
        (s) => s.name === 'LLMs & GenAI',
      )?.level,
    ).toBe(3);
    const bad = await b.put('/api/v1/student/skills', { skills: { [ids.area('genai')]: 9 } });
    expect(bad.statusCode).toBe(400);
  });

  it('goal endpoints require a goal first', async () => {
    const b = await student();
    expect(json(await b.get('/api/v1/student/goal'))).toEqual({ goal: null, skills: [] });
    const res = await b.put('/api/v1/student/goal/schedule', schedule);
    expect(errorCode(res)).toBe('CONFLICT');
  });
});
