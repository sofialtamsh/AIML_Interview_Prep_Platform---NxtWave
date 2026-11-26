import type {
  AdminPracticeQuestionDto,
  AdminPracticeResponse,
  PracticeImportResponse,
  PracticeOpenResponse,
  StudentPracticeResponse,
  TopicPageResponse,
} from '@app/contracts';
import { isPracticeLinkAllowed } from '@app/contracts';
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

let n = 0;
const link = (sid: string) =>
  `https://learning.ccbp.in/course?c_id=f13cd200&t_id=06c386de&s_id=${sid}`;
const question = (over: Record<string, unknown> = {}) => ({
  title: 'Linear regression from scratch',
  category: 'Machine Learning',
  skill: 'Regression',
  difficulty: 'MEDIUM',
  solveUrl: link('a1'),
  estimatedMinutes: 20,
  roleIds: [],
  published: true,
  sortOrder: 10,
  ...over,
});

async function admin() {
  const creds = await createAdmin(`practice${++n}@nxtwave.co.in`, 'Content-Lead-2026', 'ADMIN');
  const b = browser(app, ADMIN_ORIGIN);
  await b.post('/api/v1/admin/auth/login', creds);
  return b;
}

async function student(role = 'ai-engineer') {
  const b = browser(app, STUDENT_ORIGIN);
  const email = `solver${++n}@student.test`;
  await b.post('/api/v1/auth/register', {
    email,
    password: 'Learn-RAG-2026',
    fullName: 'Practice Student',
  });
  const res = await b.post('/api/v1/student/onboarding/complete', {
    roleId: ids.role(role),
    bracketId: ids.bracket('LPA_3_6'),
    skills: {},
    schedule: { dailyMinutes: 60, studyWeekdays: [1, 2, 3, 4, 5, 6], deadline: null },
  });
  expect(res.statusCode).toBe(200);
  const user = await testDb().user.findUniqueOrThrow({ where: { email } });
  return Object.assign(b, { id: user.id });
}

describe('practice links', () => {
  it('only accepts https links on NxtWave portals', () => {
    expect(isPracticeLinkAllowed(link('x'))).toBe(true);
    expect(isPracticeLinkAllowed('https://learning-gamma.ccbp.in/course?s_id=1')).toBe(true);
    expect(isPracticeLinkAllowed('https://www.nxtwave.tech/practice/1')).toBe(true);
    expect(isPracticeLinkAllowed('http://learning.ccbp.in/course?s_id=1')).toBe(false);
    expect(isPracticeLinkAllowed('https://ccbp.in.evil.example/x')).toBe(false);
    expect(isPracticeLinkAllowed('https://notccbp.in/x')).toBe(false);
    expect(isPracticeLinkAllowed('javascript:alert(1)')).toBe(false);
    expect(isPracticeLinkAllowed('https://ccbp.in@evil.example/x')).toBe(false);
    expect(isPracticeLinkAllowed('https://learning.ccbp.in:443/course?s_id=1')).toBe(true);
  });
});

describe('admin: practice questions', () => {
  it('adds, edits, publishes and deletes questions', async () => {
    const a = await admin();
    const foreign = await a.post(
      '/api/v1/admin/practice',
      question({ solveUrl: 'https://evil.example/q' }),
    );
    expect(foreign.statusCode).toBe(400);
    expect(
      json<{ error: { details: { fields: object } } }>(foreign).error.details.fields,
    ).toHaveProperty('solveUrl');

    const created = await a.post('/api/v1/admin/practice', question({ skill: '  ' }));
    expect(created.statusCode).toBe(201);
    const q = json<AdminPracticeQuestionDto>(created);
    expect(q).toMatchObject({ skill: null, roleIds: [], published: true, opens: { students: 0 } });

    const dup = await a.post('/api/v1/admin/practice', question({ title: 'Another name' }));
    expect(dup.statusCode).toBe(409);
    expect(errorCode(dup)).toBe('CONFLICT');

    const edited = await a.patch(`/api/v1/admin/practice/${q.id}`, {
      published: false,
      roleIds: [ids.role('ml-engineer')],
      difficulty: 'HARD',
    });
    expect(json<AdminPracticeQuestionDto>(edited)).toMatchObject({
      published: false,
      roleIds: [ids.role('ml-engineer')],
      difficulty: 'HARD',
      title: 'Linear regression from scratch',
    });

    const list = json<AdminPracticeResponse>(await a.get('/api/v1/admin/practice'));
    expect(list.items).toHaveLength(1);
    expect(list.categories).toEqual(['Machine Learning']);

    expect((await a.del(`/api/v1/admin/practice/${q.id}`)).statusCode).toBe(200);
    expect(json<AdminPracticeResponse>(await a.get('/api/v1/admin/practice')).items).toEqual([]);
    expect((await a.del(`/api/v1/admin/practice/${q.id}`)).statusCode).toBe(404);
    expect(await testDb().auditLog.count({ where: { action: { startsWith: 'practice.' } } })).toBe(
      3,
    );
  });

  it('imports rows from the sheet and skips links already listed', async () => {
    const a = await admin();
    await a.post('/api/v1/admin/practice', question());
    const row = (sid: string, title: string, category = 'Deep Learning') => ({
      title,
      category,
      skill: null,
      difficulty: 'EASY',
      solveUrl: link(sid),
      estimatedMinutes: null,
    });
    const res = await a.post('/api/v1/admin/practice/import', {
      rows: [
        row('a1', 'Already there'),
        row('b2', 'Backpropagation by hand'),
        row('c3', 'Bag of words', 'NLP'),
        row('b2', 'Backpropagation again'),
      ],
      roleIds: [ids.role('ai-engineer')],
      published: false,
    });
    expect(res.statusCode).toBe(200);
    const result = json<PracticeImportResponse>(res);
    expect(result.created).toBe(2);
    expect(result.skipped.map((s) => [s.row, s.reason])).toEqual([
      [1, 'Link already listed'],
      [4, 'Same link earlier in the paste'],
    ]);

    const items = json<AdminPracticeResponse>(await a.get('/api/v1/admin/practice')).items;
    const imported = items.filter((i) => i.solveUrl !== link('a1'));
    expect(imported).toHaveLength(2);
    expect(imported.every((i) => !i.published && i.roleIds[0] === ids.role('ai-engineer'))).toBe(
      true,
    );
    expect(Math.min(...imported.map((i) => i.sortOrder))).toBeGreaterThan(10);

    const invalid = await a.post('/api/v1/admin/practice/import', {
      rows: [row('zz', 'x')],
      roleIds: [],
      published: true,
    });
    expect(invalid.statusCode).toBe(400); // title too short
  });
});

describe('student: Practice tab', () => {
  it('lists published questions for the student role and records Solve clicks', async () => {
    const a = await admin();
    const add = async (over: Record<string, unknown>) =>
      json<AdminPracticeQuestionDto>(await a.post('/api/v1/admin/practice', question(over)));
    const everyone = await add({ solveUrl: link('p1'), category: 'Python', sortOrder: 5 });
    const forAi = await add({
      solveUrl: link('p2'),
      title: 'k-means from scratch',
      roleIds: [ids.role('ai-engineer')],
      sortOrder: 20,
    });
    const forMl = await add({ solveUrl: link('p3'), roleIds: [ids.role('ml-engineer')] });
    const draft = await add({ solveUrl: link('p4'), published: false });

    const s = await student();
    const list = json<StudentPracticeResponse>(await s.get('/api/v1/student/practice'));
    expect(list.items.map((i) => i.id)).toEqual([everyone.id, forAi.id]);
    expect(list.categories).toEqual([
      { name: 'Python', count: 1 },
      { name: 'Machine Learning', count: 1 },
    ]);
    expect(list.items.every((i) => i.openedAt === null)).toBe(true);

    expect((await s.post(`/api/v1/student/practice/${forMl.id}/open`)).statusCode).toBe(404);
    expect((await s.post(`/api/v1/student/practice/${draft.id}/open`)).statusCode).toBe(404);

    const first = json<PracticeOpenResponse>(
      await s.post(`/api/v1/student/practice/${everyone.id}/open`),
    );
    const second = json<PracticeOpenResponse>(
      await s.post(`/api/v1/student/practice/${everyone.id}/open`),
    );
    expect(second.openedAt).toBe(first.openedAt);
    const after = json<StudentPracticeResponse>(await s.get('/api/v1/student/practice'));
    expect(after.items.find((i) => i.id === everyone.id)?.openedAt).toBe(first.openedAt);

    const stats = json<AdminPracticeResponse>(await a.get('/api/v1/admin/practice')).items;
    expect(stats.find((i) => i.id === everyone.id)?.opens).toEqual({ students: 1, total: 2 });

    // Nothing is tagged yet, so no topic page lists them.
    const topic = json<TopicPageResponse>(await s.get('/api/v1/student/topics/rag'));
    expect(topic.practice).toMatchObject({ available: false, questions: 0, items: [] });
  });

  it('lists tagged questions on their topic page, with details and tags', async () => {
    const db = testDb();
    const rag = await db.topic.findUniqueOrThrow({ where: { slug: 'rag' } });
    const chunking = await db.subtopic.findFirstOrThrow({
      where: { slug: 'chunking-strategies', topicId: rag.id },
    });
    const numpy = await db.topic.findUniqueOrThrow({ where: { slug: 'python-numpy' } });
    const a = await admin();
    const bySubtopic = json<AdminPracticeQuestionDto>(
      await a.post(
        '/api/v1/admin/practice',
        question({
          solveUrl: link('t1'),
          title: 'Split a policy document into chunks',
          description: 'Chunk a long document with overlap and print each chunk.',
          askedAt: ['Fi', ' Razorpay '],
          subtopicIds: [chunking.id],
        }),
      ),
    );
    expect(bySubtopic).toMatchObject({ askedAt: ['Fi', 'Razorpay'], subtopicIds: [chunking.id] });
    const byTopic = json<AdminPracticeQuestionDto>(
      await a.post(
        '/api/v1/admin/practice',
        question({ solveUrl: link('t2'), title: 'Explain a RAG pipeline', topicIds: [rag.id] }),
      ),
    );
    await a.post(
      '/api/v1/admin/practice',
      question({ solveUrl: link('t3'), title: 'Vectorize a loop', topicIds: [numpy.id] }),
    );
    // A partial update leaves the tags alone.
    const unpublished = json<AdminPracticeQuestionDto>(
      await a.patch(`/api/v1/admin/practice/${bySubtopic.id}`, { published: false }),
    );
    expect(unpublished.subtopicIds).toEqual([chunking.id]);
    expect(unpublished.askedAt).toEqual(['Fi', 'Razorpay']);
    await a.patch(`/api/v1/admin/practice/${bySubtopic.id}`, { published: true });
    const unknown = await a.post(
      '/api/v1/admin/practice',
      question({ solveUrl: link('t4'), topicIds: ['00000000-0000-7000-8000-000000000000'] }),
    );
    expect(unknown.statusCode).toBe(400);

    const s = await student();
    const page = json<TopicPageResponse>(await s.get('/api/v1/student/topics/rag'));
    expect(page.practice.items.map((q) => q.id).sort()).toEqual([bySubtopic.id, byTopic.id].sort());
    expect(page.practice.questions).toBe(2);
    const chunk = page.practice.items.find((q) => q.id === bySubtopic.id);
    expect(chunk).toMatchObject({
      description: 'Chunk a long document with overlap and print each chunk.',
      tags: [
        {
          topicSlug: 'rag',
          subtopicSlug: 'chunking-strategies',
          subtopicTitle: 'Chunking strategies',
        },
      ],
      myRating: null,
    });

    const all = json<StudentPracticeResponse>(await s.get('/api/v1/student/practice'));
    expect(all.items).toHaveLength(3);
    // Topics in roadmap order: Python & NumPy (10) before RAG (30).
    expect(all.topics).toEqual([
      { slug: 'python-numpy', title: 'Python & NumPy for AI', count: 1 },
      { slug: 'rag', title: 'Retrieval-Augmented Generation (RAG)', count: 2 },
    ]);
  });

  it('runs the 11★ loop for questions and shows it to admins', async () => {
    const a = await admin();
    const q = json<AdminPracticeQuestionDto>(
      await a.post('/api/v1/admin/practice', question({ solveUrl: link('r1') })),
    );
    const hidden = json<AdminPracticeQuestionDto>(
      await a.post(
        '/api/v1/admin/practice',
        question({ solveUrl: link('r2'), roleIds: [ids.role('ml-engineer')] }),
      ),
    );
    const s = await student();
    const rate = (id: string, body: object) =>
      s.post(`/api/v1/student/practice/${id}/feedback`, body);
    expect((await rate(hidden.id, { rating: 5 })).statusCode).toBe(404);
    expect((await rate(q.id, { rating: 6 })).statusCode).toBe(400);
    expect((await rate(q.id, { rating: 2, tags: ['not_a_tag'] })).statusCode).toBe(400);

    expect((await rate(q.id, { rating: 2, tags: ['statement_unclear'] })).statusCode).toBe(200);
    // Rating again updates the same feedback.
    const again = await rate(q.id, {
      rating: 4,
      tags: ['good_practice'],
      text: '  Show a hint when my code fails a test case.  ',
    });
    expect(again.statusCode).toBe(200);
    const mine = json<StudentPracticeResponse>(await s.get('/api/v1/student/practice'));
    expect(mine.items.find((i) => i.id === q.id)?.myRating).toBe(4);
    expect(await testDb().feedback.count({ where: { targetType: 'PRACTICE_QUESTION' } })).toBe(1);

    const admins = json<AdminPracticeResponse>(await a.get('/api/v1/admin/practice')).items;
    expect(admins.find((i) => i.id === q.id)?.rating).toEqual({ average: 4, count: 1 });

    const feedback = json<{
      items: Array<{ kind: string; source: string; rating: number; text: string; tags: string[] }>;
      summary: Array<{ kind: string; count: number; ideas: number }>;
    }>(await a.get('/api/v1/admin/feedback/?kind=PRACTICE_QUESTION&withText=true'));
    expect(feedback.items).toEqual([
      expect.objectContaining({
        kind: 'PRACTICE_QUESTION',
        source: 'Linear regression from scratch',
        rating: 4,
        tags: ['good_practice'],
        text: 'Show a hint when my code fails a test case.',
      }),
    ]);
    expect(feedback.summary.find((x) => x.kind === 'PRACTICE_QUESTION')).toMatchObject({
      count: 1,
      ideas: 1,
    });
  });

  it('shows only all-role questions before a goal is set', async () => {
    const a = await admin();
    await a.post('/api/v1/admin/practice', question({ solveUrl: link('g1') }));
    await a.post(
      '/api/v1/admin/practice',
      question({ solveUrl: link('g2'), roleIds: [ids.role('ai-engineer')] }),
    );
    const b = browser(app, STUDENT_ORIGIN);
    await b.post('/api/v1/auth/register', {
      email: `nogoal${++n}@student.test`,
      password: 'Learn-RAG-2026',
      fullName: 'No Goal',
    });
    expect(
      json<StudentPracticeResponse>(await b.get('/api/v1/student/practice')).items,
    ).toHaveLength(1);
  });
});
