import type {
  OnboardingPlanPreviewResponse,
  RoadmapResponse,
  SchedulePreviewResponse,
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

async function student(
  bracket = 'LPA_8_12',
  opts: { python?: number; deadline?: string | null; role?: string } = {},
) {
  const b = browser(app, STUDENT_ORIGIN, clock.now);
  const email = `student${++n}@student.test`;
  expect(
    (
      await b.post('/api/v1/auth/register', {
        email,
        password: 'Learn-RAG-2026',
        fullName: 'Test Student',
      })
    ).statusCode,
  ).toBe(201);
  const res = await b.post('/api/v1/student/onboarding/complete', {
    roleId: ids.role(opts.role ?? 'ai-engineer'),
    bracketId: ids.bracket(bracket),
    skills: { [ids.area('python')]: opts.python ?? 2, [ids.area('genai')]: 0 },
    schedule: { dailyMinutes: 60, studyWeekdays: MON_SAT, deadline: opts.deadline ?? null },
  });
  expect(res.statusCode).toBe(200);
  const user = await testDb().user.findUniqueOrThrow({ where: { email } });
  return Object.assign(b, { id: user.id });
}

const roadmapOf = async (b: ReturnType<typeof browser>) =>
  json<RoadmapResponse>(await b.get('/api/v1/student/roadmap'));

const ready = async (b: ReturnType<typeof browser>) => {
  const r = await roadmapOf(b);
  expect(r.status).toBe('READY');
  if (!r.roadmap) throw new Error('no roadmap');
  return { ...r.roadmap, proposal: r.proposal };
};

const items = (r: Awaited<ReturnType<typeof ready>>) => r.topics.flatMap((t) => t.items);

async function signInAdmin() {
  const creds = await createAdmin('content@nxtwave.co.in', 'Content-Lead-2026', 'ADMIN');
  const admin = browser(app, ADMIN_ORIGIN, clock.now);
  await admin.post('/api/v1/admin/auth/login', creds);
  return admin;
}

type Overview = {
  published: { items: Array<Record<string, unknown> & { subtopicId: string }> } | null;
  draft: unknown;
};

/** Saves the published items (changed by `edit`) as a draft and publishes it. */
async function republish(
  admin: ReturnType<typeof browser>,
  bracket: string,
  edit: (
    items: Array<Record<string, unknown> & { subtopicId: string }>,
    slugs: Map<string, string>,
  ) => unknown[],
) {
  const q = `roleId=${ids.role('ai-engineer')}&bracketId=${ids.bracket(bracket)}`;
  const overview = json<Overview>(
    await admin.get(`/api/v1/admin/curriculum/curricula/target?${q}`),
  );
  const subs = await testDb().subtopic.findMany();
  const slugs = new Map(subs.map((s) => [s.slug, s.id]));
  const draftItems = edit(
    (overview.published?.items ?? []).map(({ id: _id, origin: _o, ...rest }) => ({
      ...rest,
      subtopicId: rest.subtopicId,
    })),
    slugs,
  );
  const saved = await admin.put(`/api/v1/admin/curriculum/curricula/target/draft?${q}`, {
    items: draftItems,
  });
  expect(saved.statusCode).toBe(200);
  const res = await admin.post(`/api/v1/admin/curriculum/curricula/target/publish?${q}`, {
    changeNote: 'Content review round 1',
  });
  expect(res.statusCode).toBe(200);
  return json<{ proposalsCreated: number }>(res);
}

describe('first roadmap', () => {
  it('is created at onboarding from the published curriculum, in prerequisite order', async () => {
    const b = await student();
    const r = await ready(b);

    expect(r.version).toMatchObject({ versionNumber: 1, trigger: 'INITIAL', changeSummary: null });
    expect(r.topics.map((t) => t.slug)).toEqual([
      'python-numpy',
      'embeddings-vector-search',
      'rag',
    ]);
    expect(items(r).map((i) => i.slug)).toEqual([
      'numpy-arrays-vectorization',
      'broadcasting-array-ops',
      'linear-algebra-essentials',
      'what-are-embeddings',
      'similarity-measures',
      'vector-databases-ann',
      'rag-fundamentals',
      'chunking-strategies',
      'retrieval-quality',
    ]);
    // 945 minutes at 60 a day, Monday to Saturday, from Monday 2 Nov → 16 study days.
    expect(r.totals).toMatchObject({
      totalMinutes: 945,
      remainingMinutes: 945,
      percentComplete: 0,
      plannedEndDate: '2026-11-19',
      weeklyMinutes: 360,
      subtopics: 9,
      delayed: 0,
    });
    expect(items(r)[0]).toMatchObject({ plannedStart: '2026-11-02', status: 'UP_NEXT' });
    expect(
      items(r)
        .slice(1)
        .every((i) => i.status === 'UPCOMING'),
    ).toBe(true);
    expect(r.nextUp?.slug).toBe('numpy-arrays-vectorization');
    expect(r.feasibility).toBeNull(); // no deadline
    expect(r.role.title).toBe('AI Engineer');
    expect(r.bracket.label).toBe('8–12 LPA');
    expect(items(r)[0]?.objectives.length).toBeGreaterThan(0);
  });

  it('differs by package: 3–6 LPA is lighter and marks advanced retrieval as optional', async () => {
    const junior = await ready(await student('LPA_3_6'));
    const senior = await ready(await student('LPA_8_12'));
    expect(junior.totals.totalMinutes).toBe(455);
    expect(senior.totals.totalMinutes).toBe(945);

    const jr = items(junior).find((i) => i.slug === 'retrieval-quality');
    const sr = items(senior).find((i) => i.slug === 'retrieval-quality');
    expect(jr).toMatchObject({
      isOptional: true,
      priority: 'LOW',
      depth: { rank: 1, name: 'Foundational' },
    });
    expect(sr).toMatchObject({
      isOptional: false,
      priority: 'HIGH',
      depth: { rank: 4, name: 'Advanced' },
    });
  });

  it('fast-tracks topics the student is already confident in, without lowering the depth', async () => {
    const newbie = await ready(await student('LPA_8_12', { python: 0 }));
    const confident = await ready(await student('LPA_8_12', { python: 3 }));
    const np = (r: typeof newbie) => items(r).find((i) => i.slug === 'numpy-arrays-vectorization');
    expect(np(newbie)).toMatchObject({ fastTrack: false, depth: { rank: 3 } });
    expect(np(confident)).toMatchObject({ fastTrack: true, depth: { rank: 3 } });
    expect(np(confident)?.estimatedMinutes).toBeLessThan(np(newbie)?.estimatedMinutes ?? 0);
    // The GenAI topics are rated 0 for both, so they are not fast-tracked.
    expect(items(confident).find((i) => i.slug === 'rag-fundamentals')?.fastTrack).toBe(false);
  });

  it('waits for a curriculum when none is published, then builds one on publish', async () => {
    await testDb().careerRole.update({
      where: { slug: 'ml-engineer' },
      data: { availability: 'LIVE' },
    });
    const b = await student('LPA_8_12', { role: 'ml-engineer' });
    expect((await roadmapOf(b)).status).toBe('PENDING_CURRICULUM');

    const admin = await signInAdmin();
    const q = `roleId=${ids.role('ml-engineer')}&bracketId=${ids.bracket('LPA_8_12')}`;
    const sub = await testDb().subtopic.findFirstOrThrow({
      where: { slug: 'numpy-arrays-vectorization' },
    });
    await admin.put(`/api/v1/admin/curriculum/curricula/target/draft?${q}`, {
      items: [
        {
          subtopicId: sub.id,
          priority: 'HIGH',
          targetDepthRank: 3,
          isOptional: false,
          learningObjectives: ['Vectorize code'],
        },
      ],
    });
    const pub = json<{ proposalsCreated: number }>(
      await admin.post(`/api/v1/admin/curriculum/curricula/target/publish?${q}`, {
        changeNote: 'First ML curriculum',
      }),
    );
    expect(pub.proposalsCreated).toBe(0); // a first plan is not a "proposal"

    const r = await ready(b);
    expect(r.version.trigger).toBe('INITIAL');
    expect(items(r).map((i) => i.slug)).toEqual(['numpy-arrays-vectorization']);
  });
});

describe('schedule changes', () => {
  it('previews a change without saving anything', async () => {
    const b = await student();
    const preview = json<SchedulePreviewResponse>(
      await b.post('/api/v1/student/roadmap/preview-schedule', {
        dailyMinutes: 120,
        studyWeekdays: MON_SAT,
        deadline: null,
      }),
    );
    expect(preview.current).toEqual({ plannedEndDate: '2026-11-19', totalMinutes: 945 });
    expect(preview.proposed).toMatchObject({ plannedEndDate: '2026-11-10', weeklyMinutes: 720 });
    expect((await ready(b)).version.versionNumber).toBe(1);
  });

  it('saving a new schedule re-plans from today as a new version', async () => {
    const b = await student();
    const res = await b.put('/api/v1/student/goal/schedule', {
      dailyMinutes: 120,
      studyWeekdays: MON_SAT,
      deadline: null,
    });
    expect(res.statusCode).toBe(200);
    const r = await ready(b);
    expect(r.version).toMatchObject({ versionNumber: 2, trigger: 'SETTINGS_CHANGE' });
    expect(r.version.changeSummary).toMatchObject({
      minutesDelta: 0,
      endDateDeltaDays: -9,
      added: [],
      removed: [],
    });
    expect(r.totals.plannedEndDate).toBe('2026-11-10');

    // Saving the same schedule again changes nothing.
    await b.put('/api/v1/student/goal/schedule', {
      dailyMinutes: 120,
      studyWeekdays: MON_SAT,
      deadline: null,
    });
    expect((await ready(b)).version.versionNumber).toBe(2);

    const versions = await testDb().roadmapVersion.findMany({ orderBy: { versionNumber: 'asc' } });
    expect(versions.map((v) => v.status)).toEqual(['SUPERSEDED', 'ACTIVE']);
  });

  it('updating self-ratings re-plans too', async () => {
    const b = await student('LPA_8_12', { python: 0 });
    const before = await ready(b);
    await b.put('/api/v1/student/skills', { skills: { [ids.area('python')]: 3 } });
    const after = await ready(b);
    expect(after.version.trigger).toBe('SETTINGS_CHANGE');
    expect(after.totals.totalMinutes).toBeLessThan(before.totals.totalMinutes);
  });

  it('flags an impossible deadline and offers explicit ways to fix it', async () => {
    // Deadline Friday 13 Nov: 11 study days (Mon–Sat) for 945 minutes.
    const b = await student('LPA_8_12', { deadline: '2026-11-13' });
    const r = await ready(b);
    expect(r.version.deadlineFeasible).toBe(false);
    expect(r.feasibility).toMatchObject({
      feasible: false,
      deadline: '2026-11-13',
      daysOver: 6,
      options: {
        increaseDailyTo: 90, // 945 / 11 = 86 → rounded up to 90
        extendDeadlineTo: '2026-11-19',
        skipOptional: null, // nothing is optional at 8–12 LPA
        addStudyDay: { weekday: 0, endDate: '2026-11-17', fits: false },
      },
    });
    // Nothing was dropped silently.
    expect(r.totals.subtopics).toBe(9);
  });
});

describe('falling behind and re-planning', () => {
  it('marks overdue subtopics as delayed and re-plans from today on request', async () => {
    const b = await student();
    clock.advance(5 * 86_400_000); // Saturday 7 Nov
    try {
      const behind = await ready(b);
      expect(behind.totals.delayed).toBeGreaterThan(0);
      expect(items(behind)[0]?.status).toBe('DELAYED');
      expect(behind.nextUp?.slug).toBe('numpy-arrays-vectorization');

      const res = await b.post('/api/v1/student/roadmap/replan');
      expect(res.statusCode).toBe(200);
      const r = await ready(b);
      expect(r.version).toMatchObject({ versionNumber: 2, trigger: 'REPLAN' });
      expect(items(r)[0]).toMatchObject({ plannedStart: '2026-11-07', status: 'UP_NEXT' });
      expect(r.totals.delayed).toBe(0);

      // Re-planning again on the same day is a no-op.
      await b.post('/api/v1/student/roadmap/replan');
      expect((await ready(b)).version.versionNumber).toBe(2);
    } finally {
      clock.advance(-5 * 86_400_000);
    }
  });
});

describe('curriculum updates', () => {
  const deeperRagNoRetrieval = (
    list: Array<Record<string, unknown> & { subtopicId: string }>,
    slugs: Map<string, string>,
  ) =>
    list
      .filter((i) => i.subtopicId !== slugs.get('retrieval-quality'))
      .map((i) =>
        i.subtopicId === slugs.get('rag-fundamentals') ? { ...i, targetDepthRank: 5 } : i,
      );

  it('arrive as a proposal the student can accept; nothing changes until then', async () => {
    const b = await student();
    const admin = await signInAdmin();
    const { proposalsCreated } = await republish(admin, 'LPA_8_12', deeperRagNoRetrieval);
    expect(proposalsCreated).toBe(1);

    const r = await ready(b);
    expect(r.version.versionNumber).toBe(1); // still the old plan
    expect(r.totals.subtopics).toBe(9);
    expect(r.proposal).toMatchObject({ versionNumber: 2, trigger: 'CURRICULUM_UPDATE' });
    expect(r.proposal?.changeSummary).toMatchObject({
      added: [],
      removed: [{ title: 'Improving retrieval quality' }],
      depthChanged: [{ title: 'RAG fundamentals', from: 'Advanced', to: 'Expert' }],
    });

    expect((await b.post('/api/v1/student/roadmap/proposal/accept')).statusCode).toBe(200);
    const after = await ready(b);
    expect(after.version).toMatchObject({ versionNumber: 2, trigger: 'CURRICULUM_UPDATE' });
    expect(after.proposal).toBeNull();
    expect(after.totals.subtopics).toBe(8);
    expect(items(after).find((i) => i.slug === 'rag-fundamentals')?.depth.name).toBe('Expert');

    expect(errorCode(await b.post('/api/v1/student/roadmap/proposal/accept'))).toBe('CONFLICT');
  });

  it('can be declined, keeping the current plan', async () => {
    const b = await student();
    await republish(await signInAdmin(), 'LPA_8_12', deeperRagNoRetrieval);
    expect((await b.post('/api/v1/student/roadmap/proposal/decline')).statusCode).toBe(200);
    const r = await ready(b);
    expect(r.proposal).toBeNull();
    expect(r.version.versionNumber).toBe(1);
    expect(r.totals.subtopics).toBe(9);
    const statuses = await testDb().roadmapVersion.findMany({ orderBy: { versionNumber: 'asc' } });
    expect(statuses.map((v) => v.status)).toEqual(['ACTIVE', 'DECLINED']);
  });

  it('only reach students on that role × package', async () => {
    const junior = await student('LPA_3_6');
    await republish(await signInAdmin(), 'LPA_8_12', deeperRagNoRetrieval);
    expect((await ready(junior)).proposal).toBeNull();
  });

  it('wording-only changes apply directly, with the same dates', async () => {
    const b = await student();
    const before = await ready(b);
    const { proposalsCreated } = await republish(await signInAdmin(), 'LPA_8_12', (list) =>
      list.map((i) => ({ ...i, learningObjectives: ['Explain it to a friend'] })),
    );
    expect(proposalsCreated).toBe(0);
    const r = await ready(b);
    expect(r.proposal).toBeNull();
    expect(r.version.trigger).toBe('CURRICULUM_UPDATE');
    expect(r.totals.plannedEndDate).toBe(before.totals.plannedEndDate);
    expect(items(r)[0]?.objectives).toEqual(['Explain it to a friend']);
  });

  it('a schedule change keeps a pending proposal, re-made after the new version', async () => {
    const b = await student();
    await republish(await signInAdmin(), 'LPA_8_12', deeperRagNoRetrieval);
    await b.put('/api/v1/student/goal/schedule', {
      dailyMinutes: 90,
      studyWeekdays: MON_SAT,
      deadline: null,
    });
    const r = await ready(b);
    expect(r.version).toMatchObject({ versionNumber: 2, trigger: 'SETTINGS_CHANGE' });
    expect(r.proposal).toMatchObject({ versionNumber: 3, trigger: 'CURRICULUM_UPDATE' });
  });
});

describe('changing target', () => {
  it('gives the new goal its own roadmap', async () => {
    const b = await student('LPA_8_12');
    await b.post('/api/v1/student/goal/target', {
      roleId: ids.role('ai-engineer'),
      bracketId: ids.bracket('LPA_3_6'),
    });
    const r = await ready(b);
    expect(r.bracket.label).toBe('3–6 LPA');
    expect(r.version).toMatchObject({ versionNumber: 1, trigger: 'INITIAL' });
    expect(r.totals.totalMinutes).toBe(455);
    expect(await testDb().roadmap.count()).toBe(2); // the old one is kept as history
  });
});

describe('topic page', () => {
  it('shows the student their subtopics, concepts, depth reason and Learn + Practice entry points', async () => {
    const b = await student();
    const res = await b.get('/api/v1/student/topics/rag');
    expect(res.statusCode).toBe(200);
    const page = json<TopicPageResponse>(res);
    expect(page.topic.title).toBe('Retrieval-Augmented Generation (RAG)');
    expect(page.items.map((i) => i.slug)).toEqual([
      'rag-fundamentals',
      'chunking-strategies',
      'retrieval-quality',
    ]);
    expect(page.items[2]?.concepts.map((c) => c.key)).toContain('rag.retrieval.rrf');
    expect(page.depthNote).toContain('8–12 LPA AI Engineer');
    expect(page.depthNote).toContain('Advanced');
    expect(page.learn).toEqual({ available: false, lessons: 0, completed: 0 });
    expect(page.practice).toEqual({ available: false, questions: 0, notifyMe: false });

    await b.post('/api/v1/student/interest', {
      kind: 'TOPIC',
      targetId: page.topic.id,
      notify: true,
    });
    const again = json<TopicPageResponse>(await b.get('/api/v1/student/topics/rag'));
    expect(again.practice.notifyMe).toBe(true);
  });

  it('404s for topics outside the student’s own track', async () => {
    const b = await student();
    expect((await b.get('/api/v1/student/topics/not-a-topic')).statusCode).toBe(404);
    expect(
      (
        await b.post('/api/v1/student/interest', {
          kind: 'TOPIC',
          targetId: '0190d5d0-0000-7000-8000-000000000000',
          notify: true,
        })
      ).statusCode,
    ).toBe(404);
  });
});

describe('admin view', () => {
  it('admins can open any student’s roadmap', async () => {
    const b = await student();
    const admin = await signInAdmin();
    const res = await admin.get(`/api/v1/admin/students/${b.id}/roadmap`);
    expect(res.statusCode).toBe(200);
    expect(json<RoadmapResponse>(res).roadmap?.totals.totalMinutes).toBe(945);

    const adminUser = await testDb().user.findUniqueOrThrow({
      where: { email: 'content@nxtwave.co.in' },
    });
    expect((await admin.get(`/api/v1/admin/students/${adminUser.id}/roadmap`)).statusCode).toBe(
      404,
    );
  });

  it('students cannot read the admin endpoint', async () => {
    const b = await student();
    expect((await b.get(`/api/v1/admin/students/${b.id}/roadmap`)).statusCode).toBe(401);
  });
});

describe('planner suggestions and week view', () => {
  it('suggests paces for a deadline: finish with a revision week, or just in time', async () => {
    const b = await student();
    const preview = json<SchedulePreviewResponse>(
      await b.post('/api/v1/student/roadmap/preview-schedule', {
        dailyMinutes: 60,
        studyWeekdays: MON_SAT,
        deadline: '2026-12-31',
      }),
    );
    // 945 min at 60 a day ends Thu 19 Nov: 42 days before the deadline.
    expect(preview.proposed).toMatchObject({
      startDate: '2026-11-02',
      plannedEndDate: '2026-11-19',
      totalMinutes: 945,
      studyDays: 16,
      subtopics: 9,
      topics: 3,
    });
    expect(preview.daysToSpare).toBe(42);
    // 59 days away → keep 7 for revision → finish by Thu 24 Dec: 46 study days → 25 min a day.
    expect(preview.revisionDays).toBe(7);
    expect(preview.paces).toEqual([
      {
        key: 'recommended',
        dailyMinutes: 25,
        studyWeekdays: MON_SAT,
        plannedEndDate: '2026-12-15',
        daysToSpare: 16,
      },
      {
        key: 'just-in-time',
        dailyMinutes: 20,
        studyWeekdays: MON_SAT,
        plannedEndDate: '2026-12-26',
        daysToSpare: 5,
      },
    ]);
    expect(preview.weeks.map((w) => w.minutes)).toEqual([360, 360, 225]);
  });

  it('previews the plan during onboarding, before there is a goal', async () => {
    const b = browser(app, STUDENT_ORIGIN, clock.now);
    await b.post('/api/v1/auth/register', {
      email: 'before.goal@student.test',
      password: 'Learn-RAG-2026',
      fullName: 'Early Bird',
    });
    const body = {
      roleId: ids.role('ai-engineer'),
      bracketId: ids.bracket('LPA_3_6'),
      skills: { [ids.area('python')]: 2, [ids.area('genai')]: 0 },
      schedule: { dailyMinutes: 30, studyWeekdays: [1, 2, 3, 4, 5], deadline: null },
    };
    const res = json<OnboardingPlanPreviewResponse>(
      await b.post('/api/v1/student/onboarding/plan-preview', body),
    );
    expect(res.preview?.proposed).toMatchObject({
      totalMinutes: 455,
      plannedEndDate: '2026-11-23', // 16 weekdays at 30 min,
    });
    expect(res.preview?.paces.map((p) => p.key)).toEqual(['light', 'steady', 'intensive']);
    expect(res.preview?.weeks[0]?.items[0]).toMatchObject({
      title: 'NumPy arrays & vectorization',
      topicTitle: 'Python & NumPy for AI',
    });

    // Nothing published for ML Engineer yet: no preview, no error.
    const ml = json<OnboardingPlanPreviewResponse>(
      await b.post('/api/v1/student/onboarding/plan-preview', {
        ...body,
        roleId: ids.role('ml-engineer'),
      }),
    );
    expect(ml.preview).toBeNull();
  });

  it('the roadmap has a week-by-week plan that matches its dates', async () => {
    const r = await ready(await student('LPA_8_12', { deadline: '2026-12-31' }));
    expect(r.daysToSpare).toBe(42);
    expect(r.weeks.map((w) => [w.index, w.start, w.minutes, w.studyDays])).toEqual([
      [1, '2026-11-02', 360, 6],
      [2, '2026-11-09', 360, 6],
      [3, '2026-11-16', 225, 4],
    ]);
    const first = r.weeks[0]?.items ?? [];
    expect(first.map((i) => [i.title, i.finishes])).toEqual([
      ['NumPy arrays & vectorization', true],
      ['Broadcasting & array operations', true],
      ['Linear algebra essentials for AI', true],
      ['What embeddings are', true],
      ['Similarity measures', false],
    ]);
  });

  it('exports the plan as a calendar file', async () => {
    const b = await student();
    const res = await b.get('/api/v1/student/roadmap/calendar.ics');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/calendar');
    expect(res.headers['content-disposition']).toContain('nxtwave-prep-plan.ics');
    const ics = res.body;
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(16); // one per study day
    expect(ics).toContain('DTSTART;VALUE=DATE:20261102');
    expect(ics).toContain('SUMMARY:Prep 1 h: NumPy arrays & vectorization');
    // RFC 5545: lines are at most 75 octets.
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
});
