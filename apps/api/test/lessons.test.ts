import type { CheckResult, LessonDocumentInput } from '@app/content';
import type {
  LessonFeedbackResponse,
  LessonIndexResponse,
  LessonModuleResponse,
  LessonProgressDto,
  LessonResponse,
  LessonVersionResponse,
  RoadmapResponse,
  TopicPageResponse,
} from '@app/contracts';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { bootstrapExemplarLessons } from '../src/modules/content/exemplars/bootstrap.ts';
import { CHUNKING_STRATEGIES_LESSON } from '../src/modules/content/exemplars/chunking-strategies.lesson.ts';
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

const clock = testClock(new Date('2026-11-02T04:00:00Z'));
const { app } = await createTestApp({ now: clock.now });
afterAll(async () => {
  await app.close();
});

const CONTENT = '/api/v1/admin/content';
const LESSON = '/api/v1/student/lessons/rag/chunking-strategies';
type Browser = ReturnType<typeof browser>;

let ids: Awaited<ReturnType<typeof resetWithCatalog>>;
let admin: Browser;
let chunking: string;
beforeEach(async () => {
  ids = await resetWithCatalog();
  const creds = await createAdmin('content@nxtwave.co.in', 'Content-Lead-2026', 'ADMIN');
  admin = browser(app, ADMIN_ORIGIN, clock.now);
  expect((await admin.post('/api/v1/admin/auth/login', creds)).statusCode).toBe(200);
  chunking = (
    await testDb().subtopic.findFirstOrThrow({
      where: { slug: 'chunking-strategies', topic: { slug: 'rag' } },
    })
  ).id;
});

let n = 0;
async function student(bracket = 'LPA_8_12', opts: { genai?: number } = {}) {
  const b = browser(app, STUDENT_ORIGIN, clock.now);
  const email = `learner${++n}@student.test`;
  await b.post('/api/v1/auth/register', {
    email,
    password: 'Learn-RAG-2026',
    fullName: 'Test Learner',
  });
  const res = await b.post('/api/v1/student/onboarding/complete', {
    roleId: ids.role('ai-engineer'),
    bracketId: ids.bracket(bracket),
    skills: { [ids.area('python')]: 1, [ids.area('genai')]: opts.genai ?? 0 },
    schedule: { dailyMinutes: 60, studyWeekdays: [1, 2, 3, 4, 5, 6], deadline: null },
  });
  expect(res.statusCode).toBe(200);
  return b;
}

async function importLesson(
  subtopicId = chunking,
  document: unknown = CHUNKING_STRATEGIES_LESSON,
): Promise<string> {
  const res = await admin.post(`${CONTENT}/lessons/${subtopicId}/versions`, {
    source: 'IMPORT',
    document,
  });
  expect(res.statusCode, res.body).toBe(201);
  return json<{ id: string }>(res).id;
}

const versionOf = async (id: string) =>
  json<LessonVersionResponse>(await admin.get(`${CONTENT}/versions/${id}`));

async function publish(id: string) {
  const v = await versionOf(id);
  expect(
    (await admin.post(`${CONTENT}/versions/${id}/submit`, { editSeq: v.version.editSeq }))
      .statusCode,
  ).toBe(200);
  expect(
    (await admin.post(`${CONTENT}/versions/${id}/review`, { decision: 'APPROVED' })).statusCode,
  ).toBe(200);
  const res = await admin.post(`${CONTENT}/versions/${id}/publish`, {
    changeNote: 'First version of this lesson',
  });
  expect(res.statusCode, res.body).toBe(200);
  return json<LessonVersionResponse>(res);
}

const lessonOf = async (b: Browser, url = LESSON) => {
  const res = await b.get(url);
  expect(res.statusCode, res.body).toBe(200);
  return json<LessonResponse>(res);
};

/** A small valid lesson, for subtopics other than the exemplar. */
const miniLesson = (
  title: string,
  extra: Partial<LessonDocumentInput> = {},
): LessonDocumentInput => ({
  title,
  objectives: [{ key: 'basics', text: 'Explain the basics', minDepthRank: 1 }],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      depthRank: 1,
      body: { scenario: 'A customer asks the bot about refunds.', bridge: 'Here is why.' },
    },
    {
      key: 'summary',
      kind: 'SUMMARY',
      depthRank: 1,
      body: { takeaways: ['Keep it simple.'] },
    },
  ],
  ...extra,
});

describe('admin: lessons index and import', () => {
  it('lists every subtopic with the curricula that use it and how deep', async () => {
    const res = json<LessonIndexResponse>(await admin.get(`${CONTENT}/lessons`));
    const row = res.topics
      .flatMap((t) => t.subtopics)
      .find((s) => s.slug === 'chunking-strategies');
    expect(row?.targets.map((t) => [t.bracketLabel, t.depth.rank])).toEqual([
      ['3–6 LPA', 2],
      ['8–12 LPA', 4],
    ]);
    expect(row?.published).toBeNull();
    expect(res.counts.missing).toBe(9);
  });

  it('refuses invalid lessons with the exact place of each problem', async () => {
    const bad = structuredClone(CHUNKING_STRATEGIES_LESSON) as LessonDocumentInput;
    const hook = bad.sections[0] as { body: { scenario: string } };
    hook.body.scenario = 'Click <b>here</b>';
    let res = await admin.post(`${CONTENT}/lessons/${chunking}/versions`, {
      source: 'IMPORT',
      document: bad,
    });
    expect(res.statusCode).toBe(400);
    expect(json<{ error: { details: { issues: unknown[] } } }>(res).error.details.issues).toEqual([
      { path: 'sections.0.body.scenario', message: 'Use markdown, not HTML' },
    ]);

    const unknownConcept = structuredClone(CHUNKING_STRATEGIES_LESSON) as LessonDocumentInput;
    (unknownConcept.sections[1] as { conceptKeys: string[] }).conceptKeys = ['rag.made-up'];
    res = await admin.post(`${CONTENT}/lessons/${chunking}/versions`, {
      source: 'IMPORT',
      document: unknownConcept,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('Unknown concept \\"rag.made-up\\"');
    expect(await testDb().moduleVersion.count()).toBe(0);
  });

  it('allows one working version per lesson', async () => {
    const id = await importLesson();
    const res = await admin.post(`${CONTENT}/lessons/${chunking}/versions`, {
      source: 'IMPORT',
      document: CHUNKING_STRATEGIES_LESSON,
    });
    expect(res.statusCode).toBe(409);
    expect(json<{ error: { details: { versionId: string } } }>(res).error.details.versionId).toBe(
      id,
    );
  });
});

describe('admin: edit, review and publish', () => {
  it('runs draft → review → changes requested → approved → published, with history', async () => {
    const id = await importLesson();
    let v = await versionOf(id);
    expect(v.version).toMatchObject({ status: 'DRAFT', origin: 'IMPORT', editable: true });
    expect(v.sections).toHaveLength(22);
    expect(v.sections.every((s) => s.change === 'ADDED')).toBe(true);
    // The checklist covers the depths the published curricula use.
    expect(v.depthReports.map((d) => [d.depth, d.sectionKeys.length])).toEqual([
      [2, 10],
      [4, 20],
    ]);
    expect(v.depthReports.every((d) => d.checks.every((c) => c.ok))).toBe(true);

    // Students see nothing before publishing.
    const learner = await student();
    const early = await learner.get(LESSON);
    expect(early.statusCode).toBe(404);
    expect(early.body).toContain('comingSoon');

    // Editing one section creates exactly one new revision.
    const before = new Map(v.sections.map((s) => [s.key, s.revisionId]));
    const callout = v.document.sections.find((s) => s.key === 'callout.units');
    if (callout?.kind !== 'CALLOUT') throw new Error('missing callout');
    const edited = { ...callout, body: { ...callout.body, title: 'Words, tokens or characters?' } };
    const stale = await admin.put(`${CONTENT}/versions/${id}/sections/callout.units`, {
      editSeq: v.version.editSeq + 1,
      section: edited,
    });
    expect(stale.statusCode).toBe(409);
    const saved = await admin.put(`${CONTENT}/versions/${id}/sections/callout.units`, {
      editSeq: v.version.editSeq,
      section: edited,
    });
    expect(saved.statusCode, saved.body).toBe(200);
    v = json<LessonVersionResponse>(saved);
    const changed = v.sections.filter((s) => before.get(s.key) !== s.revisionId).map((s) => s.key);
    expect(changed).toEqual(['callout.units']);
    expect(await testDb().sectionRevision.count()).toBe(23);

    // Submitting locks the draft.
    expect(
      (await admin.post(`${CONTENT}/versions/${id}/submit`, { editSeq: v.version.editSeq }))
        .statusCode,
    ).toBe(200);
    const locked = await admin.put(`${CONTENT}/versions/${id}/sections/callout.units`, {
      editSeq: v.version.editSeq + 1,
      section: callout,
    });
    expect(locked.statusCode).toBe(409);
    expect(errorCode(locked)).toBe('CONFLICT');

    // Asking for changes needs a reason, and sends the version back to draft.
    expect(
      (await admin.post(`${CONTENT}/versions/${id}/review`, { decision: 'CHANGES_REQUESTED' }))
        .statusCode,
    ).toBe(400);
    const sentBack = await admin.post(`${CONTENT}/versions/${id}/review`, {
      decision: 'CHANGES_REQUESTED',
      sectionNotes: { 'code.fixed-size': 'Show the output for overlap 0 too.' },
    });
    expect(sentBack.statusCode).toBe(200);
    v = json<LessonVersionResponse>(sentBack);
    expect(v.version.status).toBe('DRAFT');
    expect(v.reviews[0]).toMatchObject({
      decision: 'CHANGES_REQUESTED',
      sectionNotes: { 'code.fixed-size': 'Show the output for overlap 0 too.' },
    });

    // Only approved versions can be published.
    expect(
      (await admin.post(`${CONTENT}/versions/${id}/publish`, { changeNote: 'Too early' }))
        .statusCode,
    ).toBe(409);
    const published = await publish(id);
    expect(published.version).toMatchObject({ status: 'PUBLISHED', editable: false });
    expect((await lessonOf(learner)).lesson.versionNumber).toBe(1);

    // A second version starts from the published one and shows only what changed.
    const res = await admin.post(`${CONTENT}/lessons/${chunking}/versions`, {
      source: 'COPY',
      versionId: id,
    });
    expect(res.statusCode).toBe(201);
    const v2Id = json<{ id: string }>(res).id;
    let v2 = await versionOf(v2Id);
    expect(v2.version).toMatchObject({ versionNumber: 2, basedOnVersionNumber: 1 });
    expect(v2.sections.every((s) => s.change === 'UNCHANGED')).toBe(true);
    const doc = structuredClone(v2.document);
    doc.sections = doc.sections.filter((s) => s.key !== 'callout.units');
    const save = await admin.put(`${CONTENT}/versions/${v2Id}/document`, {
      editSeq: v2.version.editSeq,
      document: doc,
    });
    expect(save.statusCode, save.body).toBe(200);
    v2 = json<LessonVersionResponse>(save);
    expect(v2.removedKeys).toEqual(['callout.units']);
    await publish(v2Id);

    const module = json<LessonModuleResponse>(await admin.get(`${CONTENT}/lessons/${chunking}`));
    expect(module.versions.map((x) => [x.versionNumber, x.status])).toEqual([
      [2, 'PUBLISHED'],
      [1, 'SUPERSEDED'],
    ]);
    expect(module.publishedVersionId).toBe(v2Id);
    const audit = await testDb().auditLog.findMany({
      where: { action: { startsWith: 'content.lesson.' } },
      select: { action: true },
    });
    expect(audit.map((a) => a.action)).toContain('content.lesson.published');
  });

  it('rejects, unpublishes and discards', async () => {
    const id = await importLesson();
    const v = await versionOf(id);
    await admin.post(`${CONTENT}/versions/${id}/submit`, { editSeq: v.version.editSeq });
    const rejected = await admin.post(`${CONTENT}/versions/${id}/review`, {
      decision: 'REJECTED',
      notes: 'Wrong subtopic.',
    });
    expect(json<LessonVersionResponse>(rejected).version.status).toBe('ARCHIVED');

    const id2 = await importLesson();
    await publish(id2);
    const learner = await student('LPA_3_6');
    await lessonOf(learner);
    expect((await admin.post(`${CONTENT}/versions/${id2}/unpublish`)).statusCode).toBe(200);
    expect((await learner.get(LESSON)).statusCode).toBe(404);

    const id3 = await importLesson();
    expect(
      json<LessonVersionResponse>(await admin.post(`${CONTENT}/versions/${id3}/discard`)).version
        .status,
    ).toBe('ARCHIVED');
  });

  it('keeps concepts that lessons use', async () => {
    await importLesson();
    const concept = await testDb().concept.findUniqueOrThrow({
      where: { key: 'rag.chunking.metadata' },
    });
    const res = await admin.del(`/api/v1/admin/curriculum/concepts/${concept.id}`);
    expect(res.statusCode).toBe(409);
  });

  it('loads the reference lesson for review, never published, once', async () => {
    expect(await bootstrapExemplarLessons(testDb())).toEqual({ exemplarLessons: 1 });
    expect(await bootstrapExemplarLessons(testDb())).toEqual({ exemplarLessons: 0 });
    const versions = await testDb().moduleVersion.findMany();
    expect(versions.map((x) => [x.versionNumber, x.status])).toEqual([[1, 'UNDER_REVIEW']]);
    const learner = await student();
    expect((await learner.get(LESSON)).statusCode).toBe(404);
  });
});

describe('student: lesson player', () => {
  beforeEach(async () => {
    await publish(await importLesson());
  });

  it('shows each package its own depth, and never sends answers', async () => {
    const junior = await lessonOf(await student('LPA_3_6'));
    const senior = await lessonOf(await student('LPA_8_12'));
    expect(junior.depth).toEqual({ rank: 2, name: 'Beginner' });
    expect(junior.lesson.sections.map((s) => s.key)).toEqual([
      'hook',
      'why',
      'diagram.pipeline',
      'code.fixed-size',
      'explore.size-overlap',
      'callout.units',
      'check.basics',
      'callout.say-tradeoff',
      'interview.basic',
      'summary.basic',
    ]);
    expect(senior.lesson.sections).toHaveLength(20);
    expect(senior.lesson.totalMinutes).toBeGreaterThan(junior.lesson.totalMinutes);
    expect(senior.lesson.objectives.length).toBeGreaterThan(junior.lesson.objectives.length);

    const raw = JSON.stringify(senior);
    for (const secret of ['"answer"', '"explanation"', '"modelAnswer"', '"rubric"', '"solution"']) {
      expect(raw).not.toContain(secret);
    }
    expect(raw).toContain('"hasSolution":true');
  });

  it('is only reachable on the student’s own track', async () => {
    // Signed up but no goal yet, so no roadmap.
    const newcomer = browser(app, STUDENT_ORIGIN, clock.now);
    await newcomer.post('/api/v1/auth/register', {
      email: 'newcomer@student.test',
      password: 'Learn-RAG-2026',
      fullName: 'New Learner',
    });
    expect((await newcomer.get(LESSON)).statusCode).toBe(404);
    const learner = await student();
    expect(
      (await learner.get('/api/v1/student/lessons/python-numpy/chunking-strategies')).statusCode,
    ).toBe(404);

    // A lesson for a subtopic outside every curriculum stays out of reach.
    const rag = await testDb().topic.findUniqueOrThrow({ where: { slug: 'rag' } });
    const extra = await testDb().subtopic.create({
      data: {
        topicId: rag.id,
        slug: 'agentic-rag',
        title: 'Agentic RAG',
        summary: 'Agents that retrieve.',
      },
    });
    await publish(await importLesson(extra.id, miniLesson('Agentic RAG')));
    expect((await learner.get('/api/v1/student/lessons/rag/agentic-rag')).statusCode).toBe(404);
  });

  it('grades checks on the server, reveals afterwards and remembers the latest try', async () => {
    const learner = await student('LPA_3_6');
    const lesson = await lessonOf(learner);
    const check = lesson.lesson.sections.find((s) => s.key === 'check.basics');
    if (!check) throw new Error('no check');
    const url = `${LESSON}/checks`;
    const base = { revisionId: check.revisionId, sectionKey: check.key };

    let res = await learner.post(url, {
      ...base,
      itemKey: 'why-chunk',
      response: { type: 'mcq', choice: 'b' },
    });
    expect(json<CheckResult>(res)).toMatchObject({ correct: false, reveal: { correct: ['a'] } });
    expect(json<CheckResult>(res).explanation).toContain('own vector');
    res = await learner.post(url, {
      ...base,
      itemKey: 'term-overlap',
      response: { type: 'fill_blank', blanks: { b1: ' Overlap ' } },
    });
    expect(json<CheckResult>(res).correct).toBe(true);
    // The wrong answer type for an item is refused.
    res = await learner.post(url, {
      ...base,
      itemKey: 'why-chunk',
      response: { type: 'multi', choices: ['a'] },
    });
    expect(res.statusCode).toBe(400);
    await learner.post(url, {
      ...base,
      itemKey: 'why-chunk',
      response: { type: 'mcq', choice: 'a' },
    });

    const again = await lessonOf(learner);
    expect(again.attempts.map((a) => [a.itemKey, a.result.correct]).sort()).toEqual([
      ['term-overlap', true],
      ['why-chunk', true],
    ]);
  });

  it('only grades what this student can see in the published version', async () => {
    const junior = await student('LPA_3_6');
    const advanced = await testDb().moduleVersionSection.findFirstOrThrow({
      where: { sectionKey: 'check.advanced', version: { status: 'PUBLISHED' } },
    });
    const res = await junior.post(`${LESSON}/checks`, {
      revisionId: advanced.sectionRevisionId,
      sectionKey: 'check.advanced',
      itemKey: 'contracts',
      response: { type: 'mcq', choice: 'a' },
    });
    expect(res.statusCode).toBe(409);

    // A draft's answers can never be probed.
    const copy = await admin.post(`${CONTENT}/lessons/${chunking}/versions`, {
      source: 'COPY',
      versionId: advanced.moduleVersionId,
    });
    const draftId = json<{ id: string }>(copy).id;
    const draft = await versionOf(draftId);
    const check = draft.document.sections.find((s) => s.key === 'check.basics');
    if (check?.kind !== 'KNOWLEDGE_CHECK') throw new Error('no check');
    const item = check.body.items[0];
    if (item?.type !== 'mcq') throw new Error('no mcq');
    await admin.put(`${CONTENT}/versions/${draftId}/sections/check.basics`, {
      editSeq: draft.version.editSeq,
      section: { ...check, body: { items: [{ ...item, prompt: 'Changed in the draft' }] } },
    });
    const draftRevision = (await versionOf(draftId)).sections.find((s) => s.key === 'check.basics');
    const probe = await junior.post(`${LESSON}/checks`, {
      revisionId: draftRevision?.revisionId,
      sectionKey: 'check.basics',
      itemKey: 'why-chunk',
      response: { type: 'mcq', choice: 'a' },
    });
    expect(probe.statusCode).toBe(409);
  });

  it('self-assesses written answers after showing the model answer', async () => {
    const learner = await student('LPA_8_12');
    const lesson = await lessonOf(learner);
    const check = lesson.lesson.sections.find((s) => s.key === 'check.advanced');
    if (!check) throw new Error('no check');
    const base = { revisionId: check.revisionId, sectionKey: check.key, itemKey: 'diagnose' };
    const first = json<CheckResult>(
      await learner.post(`${LESSON}/checks`, {
        ...base,
        response: { type: 'reasoning', text: 'I would read the retrieved chunks first.' },
      }),
    );
    expect(first.correct).toBeNull();
    expect(first.reveal).toHaveProperty('modelAnswer');
    const rated = json<CheckResult>(
      await learner.post(`${LESSON}/checks`, {
        ...base,
        response: {
          type: 'reasoning',
          text: 'I would read the retrieved chunks first.',
          selfRating: 'partly',
        },
      }),
    );
    expect(rated.correct).toBe(false);
  });

  it('saves progress, completes the lesson and marks the roadmap item done', async () => {
    const learner = await student('LPA_3_6');
    const lesson = await lessonOf(learner);
    const url = `${LESSON}/progress`;
    const keys = lesson.lesson.sections.map((s) => s.key);
    const moduleVersionId = lesson.lesson.moduleVersionId;

    expect(
      (
        await learner.put(url, {
          moduleVersionId,
          sectionKey: 'playground.headings',
          completed: true,
        })
      ).statusCode,
    ).toBe(400); // not at this depth

    for (const key of keys.slice(0, -1)) {
      await learner.put(url, {
        moduleVersionId,
        sectionKey: key,
        completed: true,
        timeSpentSec: 90,
      });
    }
    // Saving the same step twice does not duplicate it; a huge gap is capped.
    const p = json<LessonProgressDto>(
      await learner.put(url, {
        moduleVersionId,
        sectionKey: keys[0],
        completed: true,
        timeSpentSec: 50_000,
      }),
    );
    expect(p.completedSectionKeys).toHaveLength(keys.length - 1);
    expect(p.timeSpentSec).toBe((keys.length - 1) * 90 + 1800);

    const early = await learner.post(`${LESSON}/complete`, { moduleVersionId });
    expect(early.statusCode).toBe(409);
    expect(
      json<{ error: { details: { missing: string[] } } }>(early).error.details.missing,
    ).toEqual(['summary.basic']);

    let roadmap = json<RoadmapResponse>(await learner.get('/api/v1/student/roadmap'));
    const item = () =>
      roadmap.roadmap?.topics.flatMap((t) => t.items).find((i) => i.slug === 'chunking-strategies');
    expect(item()?.status).not.toBe('DONE');

    await learner.put(url, { moduleVersionId, sectionKey: 'summary.basic', completed: true });
    const done = await learner.post(`${LESSON}/complete`, { moduleVersionId });
    expect(done.statusCode, done.body).toBe(200);
    expect(json<{ progress: LessonProgressDto }>(done).progress.status).toBe('COMPLETED');

    roadmap = json<RoadmapResponse>(await learner.get('/api/v1/student/roadmap'));
    expect(item()?.status).toBe('DONE');
    expect(roadmap.roadmap?.totals.doneMinutes).toBeGreaterThan(0);

    const topic = json<TopicPageResponse>(await learner.get('/api/v1/student/topics/rag'));
    expect(topic.learn).toEqual({ available: true, lessons: 1, completed: 1 });
    expect(topic.items.find((i) => i.slug === 'chunking-strategies')?.lesson).toMatchObject({
      status: 'COMPLETED',
      percent: 100,
      sections: 10,
    });
    expect(topic.items.find((i) => i.slug === 'rag-fundamentals')?.lesson).toBeNull();

    // A newer version keeps the completion and says what changed since.
    const copy = json<{ id: string }>(
      await admin.post(`${CONTENT}/lessons/${chunking}/versions`, {
        source: 'COPY',
        versionId: moduleVersionId,
      }),
    );
    const v2 = await versionOf(copy.id);
    const doc = structuredClone(v2.document);
    doc.title = 'Chunking strategies, revised';
    await admin.put(`${CONTENT}/versions/${copy.id}/document`, {
      editSeq: v2.version.editSeq,
      document: doc,
    });
    await publish(copy.id);
    const after = await lessonOf(learner);
    expect(after.progress).toMatchObject({ status: 'COMPLETED', updatedSinceCompletion: true });
  });

  it('fast-tracks basics for confident students, who can finish without them', async () => {
    const learner = await student('LPA_8_12', { genai: 3 });
    const lesson = await lessonOf(learner);
    const fast = lesson.lesson.sections.filter((s) => s.fastTrack).map((s) => s.key);
    expect(fast.length).toBeGreaterThan(0);
    expect(fast).not.toContain('hook');
    const moduleVersionId = lesson.lesson.moduleVersionId;
    for (const s of lesson.lesson.sections.filter((x) => !x.fastTrack)) {
      await learner.put(`${LESSON}/progress`, {
        moduleVersionId,
        sectionKey: s.key,
        completed: true,
      });
    }
    expect((await learner.post(`${LESSON}/complete`, { moduleVersionId })).statusCode).toBe(200);
  });

  it('reveals a playground solution only when asked', async () => {
    const learner = await student('LPA_8_12');
    const lesson = await lessonOf(learner);
    const playground = lesson.lesson.sections.find((s) => s.kind === 'PLAYGROUND');
    if (!playground) throw new Error('no playground');
    const res = await learner.post(`${LESSON}/solution`, {
      revisionId: playground.revisionId,
      sectionKey: playground.key,
    });
    expect(json<{ solution: string }>(res).solution).toContain('def chunk_by_heading');
  });

  it('collects feedback on steps, lessons and pages for the content team', async () => {
    const a = await student('LPA_3_6');
    const b = await student('LPA_3_6');
    const lesson = await lessonOf(a);
    const step = lesson.lesson.sections.find((s) => s.key === 'diagram.pipeline');
    if (!step) throw new Error('no step');
    const target = {
      target: 'SECTION',
      moduleVersionId: lesson.lesson.moduleVersionId,
      sectionKey: step.key,
      revisionId: step.revisionId,
    };
    expect((await a.post('/api/v1/student/feedback', { ...target, thumbs: 'UP' })).statusCode).toBe(
      200,
    );
    // Changing your mind updates the same row.
    await a.post('/api/v1/student/feedback', {
      ...target,
      thumbs: 'DOWN',
      tags: ['visual_unclear'],
      text: 'The arrows confused me',
    });
    await b.post('/api/v1/student/feedback', { ...target, thumbs: 'DOWN', tags: ['too_fast'] });
    await a.post('/api/v1/student/feedback', {
      target: 'LESSON',
      moduleVersionId: lesson.lesson.moduleVersionId,
      rating: 4,
      tags: ['fun_to_explore'],
      text: 'More code please',
    });
    await a.post('/api/v1/student/feedback', {
      target: 'PAGE',
      page: '/roadmap',
      tags: ['idea'],
      text: 'Show my streak here',
    });
    expect(
      (
        await a.post('/api/v1/student/feedback', {
          ...target,
          revisionId: lesson.lesson.moduleVersionId,
          thumbs: 'UP',
        })
      ).statusCode,
    ).toBe(404);

    const mine = await lessonOf(a);
    expect(mine.feedback).toEqual({ sections: { 'diagram.pipeline': 'DOWN' }, lessonRating: 4 });

    const report = json<LessonFeedbackResponse>(
      await admin.get(`${CONTENT}/lessons/${chunking}/feedback`),
    );
    expect(report.rating).toEqual({ average: 4, count: 1 });
    expect(report.sections).toEqual([
      { sectionKey: 'diagram.pipeline', up: 0, down: 2, tags: { visual_unclear: 1, too_fast: 1 } },
    ]);
    expect(report.comments.map((c) => c.text).sort()).toEqual([
      'More code please',
      'The arrows confused me',
    ]);
    expect(await testDb().feedback.count({ where: { targetType: 'PAGE' } })).toBe(1);
  });
});
