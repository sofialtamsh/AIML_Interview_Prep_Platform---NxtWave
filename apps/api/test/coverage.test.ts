import type { CoverageResponse } from '@app/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LESSON_LIBRARY } from '../src/modules/content/library/index.ts';
import { syncLessonLibrary } from '../src/modules/content/library/sync.ts';
import { weekdayPhrase } from '../src/modules/coverage/coverage.service.ts';
import { formatOf, MAPPED_UNITS, THEME_UNITS } from '../src/modules/coverage/coverage-map.ts';
import { MLE_TOPICS } from '../src/modules/curriculum/mle-curriculum.ts';
import { bootstrapMlePilot } from '../src/modules/curriculum/mle-pilot.ts';
import { PILOT_TOPICS } from '../src/modules/curriculum/pilot-curriculum.ts';
import { PREP_THEMES } from '../src/modules/hiring/hiring-rules.ts';
import {
  ADMIN_ORIGIN,
  browser,
  createAdmin,
  createTestApp,
  errorCode,
  json,
  resetWithCatalog,
  testClock,
  testDb,
} from './helpers.ts';

// Monday 2026-11-02, 09:30 in Asia/Kolkata.
const clock = testClock(new Date('2026-11-02T04:00:00Z'));
const { app, ctx } = await createTestApp({ now: clock.now });
afterAll(async () => {
  await app.close();
});

/** Two ML-titled openings under 8 LPA, six questions (one theme each, plus one outside). */
function exportFixture() {
  // [opening, company, role, domain, skills, topic, subtopic, type, coding, round, difficulty, date, text]
  // biome-ignore format: one question per line mirrors the export
  const questions: unknown[][] = [
    [0, 0, 0, 0, [0], 0, 'Background', 0, 0, 0, 0, 0, 'Tell me about yourself.'],
    [1, 1, 0, 0, [0], 0, 'Background', 0, 0, 0, 0, 0, 'Introduce yourself.'],
    [0, 0, 0, 1, [0], 1, 'Deadlock', 1, 0, 1, 1, 0, 'What is a deadlock?'],
    [1, 1, 0, 4, [3], 4, 'RAG chatbot', 2, 1, 1, 1, 0, 'Build a RAG chatbot over the given PDFs.'],
    [0, 0, 0, 2, [2], 2, 'Hooks', 1, 0, 1, 0, 0, 'What is useEffect?'],
    [0, 0, 0, 3, [1], 3, 'Mutability', 1, 0, 1, 0, 0, 'What is the difference between a list and a tuple?'],
  ];
  const opening = (k: string, co: number, nq: number) => ({
    k,
    byCompany: 0,
    co,
    roles: [0],
    domains: [0, 1, 2, 3, 4],
    skills: [0, 1, 2, 3],
    mn: 4,
    mx: 6,
    op: 2,
    from: '2026-03-02',
    to: '2026-03-02',
    nq,
  });
  return {
    dicts: {
      round: ['HR Round', 'Technical Round 1'],
      company: ['Acme AI', 'Bolt ML'],
      role: ['AI/ML Engineer Intern'],
      domain: ['HR/General', 'CS Fundamentals', 'Frontend', 'Programming Language', 'GenAI'],
      skill: ['General', 'Python', 'React', 'RAG'],
      topic: ['Candidate Background', 'Operating Systems', 'React', 'Python Basics', 'Assignment'],
      qtype: ['General', 'Conceptual', 'Project Assignment'],
      coding: ['Not Applicable', 'LLM/Gen AI Assignment'],
      date: ['2026-03-02'],
    },
    opportunities: [opening('opp-1', 0, 4), opening('opp-2', 1, 2)],
    questions,
    roundOrder: ['HR Round', 'Technical Round 1'],
    meta: {
      source: 'Coverage test export',
      dateFrom: '2026-03-02',
      dateTo: '2026-03-02',
      companies: 2,
      openings: 4,
    },
  };
}

let n = 0;
async function signIn(role: 'ADMIN' | 'SUPER_ADMIN') {
  const creds = await createAdmin(`coverage${++n}@nxtwave.co.in`, 'Coverage-Check-2026!', role);
  const b = browser(app, ADMIN_ORIGIN, clock.now);
  await b.post('/api/v1/admin/auth/login', creds);
  return b;
}

const subtopicId = async (topic: string, subtopic: string) =>
  (
    await testDb().subtopic.findFirstOrThrow({
      where: { slug: subtopic, topic: { slug: topic } },
    })
  ).id;

describe('Content coverage', () => {
  let ids: Awaited<ReturnType<typeof resetWithCatalog>>;
  let superAdmin: ReturnType<typeof browser>;

  beforeAll(async () => {
    ids = await resetWithCatalog();
    await bootstrapMlePilot(ctx);
    const db = testDb();

    // Two library lessons go to review; the self-introduction is then published.
    await syncLessonLibrary(
      db,
      LESSON_LIBRARY.filter((l) =>
        ['self-introduction', 'python-core-concepts'].includes(l.subtopicSlug),
      ),
    );
    const intro = await subtopicId('self-introduction-hr', 'self-introduction');
    await db.moduleVersion.updateMany({
      where: { module: { subtopicId: intro } },
      data: { status: 'PUBLISHED', publishedAt: clock.now() },
    });

    // Practice: one question counts; an unpublished one and one for another role do not.
    const core = await subtopicId('python-for-interviews', 'python-core-concepts');
    const question = (title: string, published: boolean, roleSlug?: string) =>
      db.practiceQuestion.create({
        data: {
          title,
          category: 'Python',
          difficulty: 'EASY',
          solveUrl: `https://learning.ccbp.in/practice/${encodeURIComponent(title)}`,
          published,
          subtopics: { create: [{ subtopicId: core }] },
          ...(roleSlug ? { roles: { create: [{ roleId: ids.role(roleSlug) }] } } : {}),
        },
      });
    await question('List vs tuple', true);
    await question('Draft question', false);
    await question('For AI Engineers only', true, 'ai-engineer');

    superAdmin = await signIn('SUPER_ADMIN');
    const imported = await superAdmin.post('/api/v1/admin/hiring/import', exportFixture());
    expect(imported.statusCode).toBe(200);
  });

  it('shows the plan package of the live role, joined with lessons, practice and the plan', async () => {
    const res = await superAdmin.get('/api/v1/admin/coverage');
    expect(res.statusCode).toBe(200);
    const body = json<CoverageResponse>(res);

    expect(body.targets).toHaveLength(4);
    expect(body.target).toMatchObject({
      roleTitle: 'ML Engineer',
      bracketId: ids.bracket('LPA_3_6'),
      units: 49,
    });
    expect(body.schedule).toEqual({
      startDate: '2026-11-02',
      dailyMinutes: 60,
      studyWeekdays: [1, 2, 3, 4, 5, 6],
      deadline: '2026-12-02',
    });
    expect(body.summary).toMatchObject({
      units: 49,
      optionalUnits: 9,
      written: 2,
      live: 1,
      inReview: 1,
      notStarted: 47,
      olderFormat: 0,
      withPractice: 1,
      measuredUnits: 2,
      // 31 days from Monday 2 November to Wednesday 2 December, four of them Sundays.
      deadlineStudyDays: 27,
      firstNotLive: { title: 'Internship and experience story', day: 1 },
      firstNotWritten: { title: 'Internship and experience story', day: 1 },
    });
    expect(body.summary.studyDays).toBeGreaterThan(27);
    expect(body.summary.fitsWithDailyMinutes).toBe(75);

    // Units follow the roadmap: day numbers never go back, the first unit starts on day 1.
    expect(body.units.map((u) => u.sequence)).toEqual(body.units.map((_, i) => i + 1));
    const days = body.units.map((u) => u.startDay ?? 0);
    expect(days[0]).toBe(1);
    expect(days.every((d, i) => i === 0 || d >= (days[i - 1] ?? 0))).toBe(true);

    const intro = body.units.find((u) => u.slug === 'self-introduction');
    expect(intro?.lesson).toMatchObject({ state: 'LIVE', liveVersion: 1, olderFormat: false });
    expect(intro?.lesson.minutes).toBeGreaterThan(5);
    expect(intro?.plannedMinutes).toBeGreaterThan(intro?.plannedLessonMinutes ?? 0);
    const core = body.units.find((u) => u.slug === 'python-core-concepts');
    expect(core).toMatchObject({ practice: 1, lesson: { state: 'IN_REVIEW', workingVersion: 1 } });

    const titles = body.signals.map((s) => s.title);
    expect(titles).toContain("Students reach a lesson that isn't live on study day 1");
    expect(titles).toContain('1 of 49 units have practice questions');
    expect(titles).toContain('The roadmap needs 33 study days; the deadline allows 27');
    expect(body.signals[0]?.tone).toBe('bad');
    expect(titles.some((t) => /high-priority units have no lesson yet/.test(t))).toBe(true);
  });

  it('adds the interview evidence for super admins', async () => {
    const body = json<CoverageResponse>(await superAdmin.get('/api/v1/admin/coverage'));
    const e = body.evidence;
    expect(body.evidenceNote).toBeNull();
    expect(e).toMatchObject({ band: 'UNDER_8_LPA', companies: 2, questions: 6 });
    // Self-introduction (2, live) and core Python (1, in review) of six questions.
    expect(e?.writtenShare).toBeCloseTo(3 / 6);
    expect(e?.liveShare).toBeCloseTo(2 / 6);

    const theme = (name: string) => e?.themes.find((t) => t.theme === name);
    expect(theme('Self-introduction and background')).toMatchObject({
      companies: 2,
      share: 1,
      flag: null,
      units: [{ title: 'Self-introduction pitch', state: 'LIVE', inCurriculum: true }],
    });
    expect(theme('CS fundamentals and Git')).toMatchObject({
      share: 0.5,
      flag: 'OPTIONAL_ONLY',
      units: [{ title: 'Git and engineering basics', optional: true }],
    });
    expect(e?.formats.find((f) => f.key === 'assignment')).toMatchObject({
      companies: 1,
      share: 0.5,
      flag: 'NO_UNIT',
      units: [],
    });
    expect(e?.outside).toMatchObject({
      questions: 1,
      companies: 1,
      groups: [{ label: 'React', domain: 'Frontend', example: 'What is useEffect?' }],
    });

    const intro = body.units.find((u) => u.slug === 'self-introduction');
    expect(intro?.evidence).toEqual({
      themes: ['Self-introduction and background'],
      companies: 2,
      share: 1,
      questions: 2,
    });
    const titles = body.signals.map((s) => s.title);
    expect(titles).toContain('No unit prepares students for: take-home or live-build assignment');
    expect(titles).toContain(
      '"CS fundamentals and Git" is asked widely but taught only in optional units',
    );
    expect(titles).toContain("Written lessons teach about 50% of this band's interview questions");
    expect(titles).toContain('Only 2 companies in this band: read the shares as rough');
  });

  it('keeps the interview evidence from admins who are not super admins', async () => {
    const admin = await signIn('ADMIN');
    const res = await admin.get('/api/v1/admin/coverage');
    expect(res.statusCode).toBe(200);
    const body = json<CoverageResponse>(res);
    expect(body.evidence).toBeNull();
    expect(body.evidenceNote).toBe('Interview evidence is visible to super admins only.');
    expect(body.units.every((u) => u.evidence === null)).toBe(true);
    expect(JSON.stringify(body.signals)).not.toMatch(/companies|interview questions/);
    expect(body.summary.live).toBe(1);
  });

  it('measures another role and package on request, and refuses an unknown one', async () => {
    const ai = json<CoverageResponse>(
      await superAdmin.get(
        `/api/v1/admin/coverage?roleId=${ids.role('ai-engineer')}&bracketId=${ids.bracket('LPA_8_12')}`,
      ),
    );
    expect(ai.target).toMatchObject({ roleTitle: 'AI Engineer', bracketLabel: '8–12 LPA' });
    expect(ai.evidence).toBeNull();
    expect(ai.evidenceNote).toBe('Interview evidence covers the ML Engineer family only.');

    const missing = await superAdmin.get(
      `/api/v1/admin/coverage?roleId=${ids.role('data-engineer')}&bracketId=${ids.bracket('LPA_3_6')}`,
    );
    expect(missing.statusCode).toBe(404);
    expect(errorCode(missing)).toBe('NOT_FOUND');
    const bad = await superAdmin.get('/api/v1/admin/coverage?roleId=not-a-uuid');
    expect(bad.statusCode).toBe(400);
  });
});

describe('Content coverage map', () => {
  it('maps every interview theme and points only at real curriculum units', () => {
    expect(Object.keys(THEME_UNITS).sort()).toEqual([...PREP_THEMES].sort());
    const units = new Set(
      [...MLE_TOPICS, ...PILOT_TOPICS].flatMap((t) =>
        t.subtopics.map((s) => `${t.slug}/${s.slug}`),
      ),
    );
    expect(MAPPED_UNITS.filter((k) => !units.has(k))).toEqual([]);
  });

  it('tells assignments apart from the coding inside them', () => {
    expect(
      formatOf({ questionType: 'Project Assignment', codingType: 'Problem Solving' })?.key,
    ).toBe('assignment');
    expect(formatOf({ questionType: 'Coding', codingType: 'AI/ML Assignment' })?.key).toBe(
      'assignment',
    );
    expect(formatOf({ questionType: 'Coding', codingType: 'Basic Coding' })?.key).toBe(
      'basic-coding',
    );
    expect(formatOf({ questionType: 'Coding', codingType: 'DSA Coding' })?.key).toBe('dsa');
    expect(
      formatOf({ questionType: 'Projects Discussion', codingType: 'Not Applicable' })?.key,
    ).toBe('project-discussion');
    expect(formatOf({ questionType: 'Conceptual', codingType: 'Not Applicable' })).toBeNull();
  });

  it('writes study days as a short phrase', () => {
    expect(weekdayPhrase([1, 2, 3, 4, 5, 6])).toBe('Mon–Sat');
    expect(weekdayPhrase([5, 1, 3])).toBe('Mon, Wed, Fri');
    expect(weekdayPhrase([0, 1, 2, 3, 6])).toBe('Sun–Wed, Sat');
  });
});
