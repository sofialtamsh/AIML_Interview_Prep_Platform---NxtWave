import type { RoadmapResponse, StudentStudyPlan } from '@app/contracts';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  MLE_V2_3_6,
  MLE_V2_8_12,
  MLE_V2_CHANGE_NOTE,
} from '../src/modules/curriculum/mle-curriculum.ts';
import {
  bootstrapMlePilot,
  MLE_INTERIM_CHANGE_NOTE,
  pilotStudyPlan,
} from '../src/modules/curriculum/mle-pilot.ts';
import { createMissingCurricula, LPA_3_6 } from '../src/modules/curriculum/pilot-curriculum.ts';
import { STUDY_PLAN_KEY } from '../src/modules/study-plan/study-plan.store.ts';
import {
  browser,
  createTestApp,
  json,
  resetWithCatalog,
  STUDENT_ORIGIN,
  testClock,
  testDb,
} from './helpers.ts';

// Monday 2026-11-02, 09:30 in Asia/Kolkata.
const clock = testClock(new Date('2026-11-02T04:00:00Z'));
const { app, ctx } = await createTestApp({ now: clock.now });
afterAll(async () => {
  await app.close();
});

let ids: Awaited<ReturnType<typeof resetWithCatalog>>;
beforeEach(async () => {
  ids = await resetWithCatalog();
});

let n = 0;
async function enrolled(role: string, bracket = 'LPA_8_12') {
  const b = browser(app, STUDENT_ORIGIN, clock.now);
  const email = `pilot${++n}@student.test`;
  await b.post('/api/v1/auth/register', { email, password: 'Learn-RAG-2026', fullName: 'Pilot' });
  const res = await b.post('/api/v1/student/onboarding/complete', {
    roleId: ids.role(role),
    bracketId: ids.bracket(bracket),
    skills: {},
    schedule: { dailyMinutes: 90, studyWeekdays: [1, 2, 3, 4, 5, 6], deadline: null },
  });
  expect(res.statusCode).toBe(200);
  const user = await testDb().user.findUniqueOrThrow({ where: { email } });
  return Object.assign(b, { id: user.id });
}

const availability = async (slug: string) =>
  (await testDb().careerRole.findUniqueOrThrow({ where: { slug } })).availability;

const mleCurricula = () =>
  testDb().roleCurriculum.findMany({
    where: { roleId: ids.role('ml-engineer') },
    include: { bracket: true, items: { include: { subtopic: { include: { topic: true } } } } },
    orderBy: { version: 'asc' },
  });

describe('ML Engineer pilot bootstrap', () => {
  it('opens ML Engineer, moves AI Engineer students onto the team plan, once', async () => {
    const s = await enrolled('ai-engineer');
    const result = await bootstrapMlePilot(ctx);
    expect(result).toMatchObject({
      taxonomy: { topics: 13, subtopics: 54 },
      curricula: 2,
      upgraded: { curricula: 0, proposals: 0 },
      switched: true,
      movedToMle: 1,
      plan: { updated: 0, movedPackage: 0 },
    });
    expect(await availability('ml-engineer')).toBe('LIVE');
    expect(await availability('ai-engineer')).toBe('NEXT_UP');

    // One new goal: ML Engineer, on the plan's package and time, from the original start.
    const goals = await testDb().studentGoal.findMany({
      where: { studentId: s.id },
      include: { role: true, bracket: true },
      orderBy: { createdAt: 'asc' },
    });
    expect(goals.map((g) => [g.role.slug, g.bracket.code, g.isActive])).toEqual([
      ['ai-engineer', 'LPA_8_12', false],
      ['ml-engineer', 'LPA_3_6', true],
    ]);
    expect(goals[1]?.dailyMinutes).toBe(60);
    expect(goals[1]?.deadline?.toISOString().slice(0, 10)).toBe('2026-12-02');

    const roadmap = json<RoadmapResponse>(await s.get('/api/v1/student/roadmap'));
    expect(roadmap.status).toBe('READY');
    expect(roadmap.roadmap?.role.title).toBe('ML Engineer');
    // The interview-first order: introduction first, deployment last.
    const topics = roadmap.roadmap?.topics.map((t) => t.slug) ?? [];
    expect(topics[0]).toBe('self-introduction-hr');
    expect(topics.at(-1)).toBe('model-deployment');
    expect(topics).not.toContain('python-numpy');
    expect(json<StudentStudyPlan>(await s.get('/api/v1/student/study-plan'))).toMatchObject({
      studentsChooseSchedule: false,
      studentsChoosePackage: false,
    });

    // Later admin changes are never undone by another run.
    await testDb().careerRole.update({
      where: { slug: 'ai-engineer' },
      data: { availability: 'LIVE' },
    });
    expect(await bootstrapMlePilot(ctx)).toMatchObject({
      taxonomy: { topics: 0, subtopics: 0, concepts: 0 },
      curricula: 0,
      upgraded: { curricula: 0, proposals: 0 },
      switched: false,
      plan: null,
    });
    expect(await availability('ai-engineer')).toBe('LIVE');
  });

  it('keeps a study plan an admin already saved', async () => {
    const custom = { ...pilotStudyPlan(ids.bracket('LPA_8_12')), dailyMinutes: 120 };
    await testDb().platformSetting.create({ data: { key: STUDY_PLAN_KEY, value: custom } });
    const s = await enrolled('ai-engineer');
    await bootstrapMlePilot(ctx);
    const goal = await testDb().studentGoal.findFirstOrThrow({
      where: { studentId: s.id, isActive: true },
      include: { bracket: true },
    });
    expect(goal.bracket.code).toBe('LPA_8_12');
    expect(goal.dailyMinutes).toBe(120);
  });
});

describe('ML Engineer interview curriculum v2', () => {
  it('covers every interview round, with priorities from the hiring data', async () => {
    await bootstrapMlePilot(ctx);
    const curricula = await mleCurricula();
    expect(curricula.map((c) => c.bracket.code).sort()).toEqual(['LPA_3_6', 'LPA_8_12']);
    const by = (code: string) => curricula.find((c) => c.bracket.code === code);
    const c36 = by('LPA_3_6');
    const c812 = by('LPA_8_12');
    expect(c36?.items).toHaveLength(Object.keys(MLE_V2_3_6).length);
    expect(c812?.items).toHaveLength(Object.keys(MLE_V2_8_12).length);
    expect(c36?.changeNote).toBe(MLE_V2_CHANGE_NOTE);

    const item = (c: typeof c36, key: string) =>
      c?.items.find((i) => `${i.subtopic.topic.slug}/${i.subtopic.slug}` === key);
    // The most-asked areas are must-know at both packages.
    for (const key of [
      'project-deep-dive/project-pitch',
      'self-introduction-hr/self-introduction',
      'python-for-interviews/python-coding-round',
      'rag/rag-fundamentals',
    ]) {
      expect(item(c36, key)?.priority, key).toBe('HIGH');
    }
    // Aptitude only matters below 8 LPA; agents become must-know above it.
    expect(item(c36, 'self-introduction-hr/aptitude-reasoning')?.isOptional).toBe(true);
    expect(item(c812, 'self-introduction-hr/aptitude-reasoning')).toBeUndefined();
    expect(item(c36, 'llms-agents/agents-frameworks')?.priority).toBe('MEDIUM');
    expect(item(c812, 'llms-agents/agents-frameworks')?.priority).toBe('HIGH');
    // The deeper package goes deeper on the same subtopic.
    expect(item(c812, 'project-deep-dive/project-architecture')?.targetDepthRank).toBeGreaterThan(
      item(c36, 'project-deep-dive/project-architecture')?.targetDepthRank ?? 9,
    );
    // Every item says why it is there.
    expect(c36?.items.every((i) => (i.rationale ?? '').length > 10)).toBe(true);
  });

  it('upgrades the interim curriculum once and proposes the update to its students', async () => {
    // A database from before the interview data: the interim v1 is published and in use.
    await createMissingCurricula(
      testDb(),
      [
        { role: 'ml-engineer', bracket: 'LPA_3_6', items: LPA_3_6 },
        { role: 'ml-engineer', bracket: 'LPA_8_12', items: LPA_3_6 },
      ],
      MLE_INTERIM_CHANGE_NOTE,
    );
    // An admin already edited the 8–12 curriculum: that one must be left alone.
    await testDb().roleCurriculum.updateMany({
      where: { roleId: ids.role('ml-engineer'), bracket: { code: 'LPA_8_12' } },
      data: { changeNote: 'Edited by the content team' },
    });
    await testDb().careerRole.update({
      where: { id: ids.role('ml-engineer') },
      data: { availability: 'LIVE' },
    });
    const s = await enrolled('ml-engineer', 'LPA_3_6');
    expect(
      json<RoadmapResponse>(await s.get('/api/v1/student/roadmap')).roadmap?.topics,
    ).toHaveLength(3);

    const result = await bootstrapMlePilot(ctx);
    expect(result.upgraded).toEqual({ curricula: 1, proposals: 1 });
    const curricula = await mleCurricula();
    const v36 = curricula.filter((c) => c.bracket.code === 'LPA_3_6');
    expect(v36.map((c) => [c.version, c.status])).toEqual([
      [1, 'SUPERSEDED'],
      [2, 'PUBLISHED'],
    ]);
    expect(curricula.find((c) => c.bracket.code === 'LPA_8_12')?.changeNote).toBe(
      'Edited by the content team',
    );

    // The student decides: their plan stays until they accept the proposal.
    const before = json<RoadmapResponse>(await s.get('/api/v1/student/roadmap'));
    expect(before.proposal?.changeSummary?.added.length).toBeGreaterThan(20);
    const accepted = json<RoadmapResponse>(await s.post('/api/v1/student/roadmap/proposal/accept'));
    expect(accepted.roadmap?.topics.length).toBeGreaterThan(10);

    // The role card now reflects what interviews ask, including GenAI in the self-check.
    const role = await testDb().careerRole.findUniqueOrThrow({
      where: { id: ids.role('ml-engineer') },
      include: { skillAreas: { include: { skillArea: true } } },
    });
    expect(role.interviewFocus).toContain('Project deep-dive');
    expect(role.skillAreas.map((a) => a.skillArea.slug)).toContain('genai');

    expect((await bootstrapMlePilot(ctx)).upgraded).toEqual({ curricula: 0, proposals: 0 });
  });

  it('fits the 3–6 LPA core into a 30-day, 1-hour-a-day plan', async () => {
    await bootstrapMlePilot(ctx);
    const s = await enrolled('ml-engineer');
    const roadmap = json<RoadmapResponse>(await s.get('/api/v1/student/roadmap')).roadmap;
    const core = (roadmap?.topics ?? [])
      .flatMap((t) => t.items)
      .filter((i) => !i.isOptional)
      .reduce((a, i) => a + i.estimatedMinutes, 0);
    // About 26 study days of 60 minutes (Mon–Sat over 30 days), with optional extras on top.
    expect(core).toBeLessThanOrEqual(30 * 60);
    expect(core).toBeGreaterThanOrEqual(20 * 60);
  });
});
