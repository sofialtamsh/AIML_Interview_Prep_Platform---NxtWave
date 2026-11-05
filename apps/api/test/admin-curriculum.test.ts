import type { CurriculaIndex, CurriculumOverview, TaxonomyResponse } from '@app/contracts';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { bootstrapPilotCurriculum } from '../src/modules/curriculum/pilot-curriculum.ts';
import {
  ADMIN_ORIGIN,
  browser,
  createAdmin,
  createTestApp,
  errorCode,
  json,
  resetWithCatalog,
  testDb,
} from './helpers.ts';

const { app } = await createTestApp();
afterAll(async () => {
  await app.close();
});

let ids: Awaited<ReturnType<typeof resetWithCatalog>>;
let admin: ReturnType<typeof browser>;
beforeEach(async () => {
  ids = await resetWithCatalog();
  const creds = await createAdmin('content@nxtwave.co.in', 'Content-Lead-2026', 'ADMIN');
  admin = browser(app, ADMIN_ORIGIN);
  await admin.post('/api/v1/admin/auth/login', creds);
});

const base = '/api/v1/admin/curriculum';
const taxonomy = async () => json<TaxonomyResponse>(await admin.get(`${base}/taxonomy`));
const subtopicId = async (slug: string) =>
  (await testDb().subtopic.findFirstOrThrow({ where: { slug } })).id;
const topicId = async (slug: string) =>
  (await testDb().topic.findUniqueOrThrow({ where: { slug } })).id;
const target = (bracket = 'LPA_8_12') =>
  `roleId=${ids.role('ai-engineer')}&bracketId=${ids.bracket(bracket)}`;
const item = (id: string, over: Record<string, unknown> = {}) => ({
  subtopicId: id,
  priority: 'HIGH',
  targetDepthRank: 3,
  isOptional: false,
  learningObjectives: ['Explain it in your own words'],
  ...over,
});

describe('pilot curriculum bootstrap', () => {
  it('seeds 3 topics, 9 subtopics, their concepts and prerequisites', async () => {
    const t = await taxonomy();
    expect(t.topics.map((x) => x.slug)).toEqual([
      'python-numpy',
      'embeddings-vector-search',
      'rag',
    ]);
    expect(t.topics.map((x) => x.subtopics.length)).toEqual([3, 3, 3]);
    expect(t.topics.flatMap((x) => x.subtopics.flatMap((s) => s.concepts)).length).toBe(28);

    const rag = t.topics.find((x) => x.slug === 'rag');
    expect(rag?.prerequisiteIds).toEqual([await topicId('embeddings-vector-search')]);
    const retrieval = rag?.subtopics.find((s) => s.slug === 'retrieval-quality');
    expect(retrieval?.prerequisiteIds.sort()).toEqual(
      [await subtopicId('chunking-strategies'), await subtopicId('similarity-measures')].sort(),
    );
  });

  it('is idempotent and never overwrites admin edits', async () => {
    const db = testDb();
    await db.topic.update({ where: { slug: 'rag' }, data: { title: 'RAG (edited)' } });
    expect(await bootstrapPilotCurriculum(db)).toEqual({
      topics: 0,
      subtopics: 0,
      concepts: 0,
      curricula: 0,
    });
    expect((await db.topic.findUniqueOrThrow({ where: { slug: 'rag' } })).title).toBe(
      'RAG (edited)',
    );
    expect(await db.roleCurriculum.count()).toBe(2);
  });

  it('publishes AI Engineer for the two pilot packages only', async () => {
    const index = json<CurriculaIndex>(await admin.get(`${base}/curricula`));
    expect(index.targets).toHaveLength(5 * 4);
    const published = index.targets.filter((x) => x.publishedVersion !== null);
    expect(published.map((x) => x.bracketId).sort()).toEqual(
      [ids.bracket('LPA_3_6'), ids.bracket('LPA_8_12')].sort(),
    );
    expect(published.every((x) => x.roleId === ids.role('ai-engineer') && x.itemCount === 9)).toBe(
      true,
    );
  });
});

describe('taxonomy editing', () => {
  it('creates topics, subtopics and concepts, rejecting duplicate slugs and keys', async () => {
    const created = await admin.post(`${base}/topics`, {
      slug: 'llm-evaluation',
      title: 'Evaluating LLM apps',
      summary: 'How to tell whether an LLM feature is actually good.',
      skillAreaId: ids.area('genai'),
      sortOrder: 40,
      prerequisiteIds: [await topicId('rag')],
    });
    expect(created.statusCode).toBe(201);
    const { id } = json<{ id: string }>(created);

    const sub = await admin.post(`${base}/subtopics`, {
      topicId: id,
      slug: 'llm-as-judge',
      title: 'LLM-as-a-judge',
      summary: 'Using a model to grade another model, and its pitfalls.',
      sortOrder: 10,
      complexity: 4,
      prerequisiteIds: [await subtopicId('rag-fundamentals')],
    });
    expect(sub.statusCode).toBe(201);
    const concept = await admin.post(`${base}/concepts`, {
      subtopicId: json<{ id: string }>(sub).id,
      key: 'eval.llm-judge.bias',
      name: 'Judge bias',
      sortOrder: 10,
    });
    expect(concept.statusCode).toBe(201);

    const t = await taxonomy();
    expect(t.topics.at(-1)).toMatchObject({
      slug: 'llm-evaluation',
      subtopics: [{ slug: 'llm-as-judge' }],
    });

    expect(
      errorCode(
        await admin.post(`${base}/topics`, {
          slug: 'rag',
          title: 'Duplicate',
          summary: 'Same slug as an existing topic.',
          skillAreaId: null,
          sortOrder: 1,
          prerequisiteIds: [],
        }),
      ),
    ).toBe('CONFLICT');
    expect(
      errorCode(
        await admin.post(`${base}/concepts`, {
          subtopicId: await subtopicId('rag-fundamentals'),
          key: 'rag.pipeline',
          name: 'Duplicate key',
          sortOrder: 1,
        }),
      ),
    ).toBe('CONFLICT');
  });

  it('rejects prerequisite loops for subtopics and topics', async () => {
    // numpy-arrays ← broadcasting ← linear-algebra already; making numpy need linear algebra loops.
    const loop = await admin.patch(
      `${base}/subtopics/${await subtopicId('numpy-arrays-vectorization')}`,
      {
        prerequisiteIds: [await subtopicId('linear-algebra-essentials')],
      },
    );
    expect(loop.statusCode).toBe(400);
    expect(errorCode(loop)).toBe('VALIDATION_ERROR');

    const self = await admin.patch(`${base}/subtopics/${await subtopicId('rag-fundamentals')}`, {
      prerequisiteIds: [await subtopicId('rag-fundamentals')],
    });
    expect(self.statusCode).toBe(400);

    const topicLoop = await admin.patch(`${base}/topics/${await topicId('python-numpy')}`, {
      prerequisiteIds: [await topicId('rag')],
    });
    expect(topicLoop.statusCode).toBe(400);

    // A valid edit still works.
    const ok = await admin.patch(`${base}/subtopics/${await subtopicId('rag-fundamentals')}`, {
      title: 'RAG basics',
      prerequisiteIds: [
        await subtopicId('what-are-embeddings'),
        await subtopicId('similarity-measures'),
      ],
    });
    expect(ok.statusCode).toBe(200);
  });

  it('edits and deletes concepts', async () => {
    const c = await testDb().concept.findUniqueOrThrow({ where: { key: 'rag.pipeline' } });
    expect(
      (await admin.patch(`${base}/concepts/${c.id}`, { name: 'The RAG loop' })).statusCode,
    ).toBe(200);
    expect((await testDb().concept.findUniqueOrThrow({ where: { id: c.id } })).name).toBe(
      'The RAG loop',
    );
    expect((await admin.del(`${base}/concepts/${c.id}`)).statusCode).toBe(200);
    expect((await admin.del(`${base}/concepts/${c.id}`)).statusCode).toBe(404);
  });
});

describe('role × package curricula', () => {
  it('drafts, discards and publishes, keeping history', async () => {
    const start = json<CurriculumOverview>(await admin.get(`${base}/curricula/target?${target()}`));
    expect(start.published?.version).toBe(1);
    expect(start.draft).toBeNull();
    expect(start.published?.items).toHaveLength(9);

    expect(
      errorCode(
        await admin.post(`${base}/curricula/target/publish?${target()}`, { changeNote: 'Nothing' }),
      ),
    ).toBe('CONFLICT');

    const items = [
      item(await subtopicId('numpy-arrays-vectorization')),
      item(await subtopicId('rag-fundamentals')),
    ];
    const saved = json<CurriculumOverview>(
      await admin.put(`${base}/curricula/target/draft?${target()}`, {
        items,
        changeNote: 'Trim for test',
      }),
    );
    expect(saved.draft).toMatchObject({ version: 2, status: 'DRAFT' });
    expect(saved.draft && (saved.draft as { items: unknown[] }).items).toHaveLength(2);
    expect(saved.published?.version).toBe(1); // students still see v1

    const discarded = json<CurriculumOverview>(
      await admin.del(`${base}/curricula/target/draft?${target()}`),
    );
    expect(discarded.draft).toBeNull();
    expect((await admin.del(`${base}/curricula/target/draft?${target()}`)).statusCode).toBe(404);

    await admin.put(`${base}/curricula/target/draft?${target()}`, { items });
    const pub = await admin.post(`${base}/curricula/target/publish?${target()}`, {
      changeNote: 'Round 1 review',
    });
    expect(pub.statusCode).toBe(200);
    expect(json<{ curriculum: { version: number; status: string } }>(pub).curriculum).toMatchObject(
      {
        version: 2,
        status: 'PUBLISHED',
      },
    );

    const after = json<CurriculumOverview>(await admin.get(`${base}/curricula/target?${target()}`));
    expect(after.history.map((h) => [h.version, h.status])).toEqual([
      [2, 'PUBLISHED'],
      [1, 'SUPERSEDED'],
    ]);
    const audit = await testDb().auditLog.findFirst({ where: { action: 'curriculum.published' } });
    expect(audit?.after).toMatchObject({ version: 2, items: 2 });
  });

  it('validates drafts: no duplicates, real subtopics, objectives required, non-empty to publish', async () => {
    const id = await subtopicId('rag-fundamentals');
    const dup = await admin.put(`${base}/curricula/target/draft?${target()}`, {
      items: [item(id), item(id)],
    });
    expect(dup.statusCode).toBe(400);

    const unknown = await admin.put(`${base}/curricula/target/draft?${target()}`, {
      items: [item('0190d5d0-0000-7000-8000-000000000000')],
    });
    expect(unknown.statusCode).toBe(400);

    const noObjectives = await admin.put(`${base}/curricula/target/draft?${target()}`, {
      items: [item(id, { learningObjectives: [] })],
    });
    expect(noObjectives.statusCode).toBe(400);

    await admin.put(`${base}/curricula/target/draft?${target()}`, { items: [] });
    const empty = await admin.post(`${base}/curricula/target/publish?${target()}`, {
      changeNote: 'Empty',
    });
    expect(empty.statusCode).toBe(400);
  });

  it('404s for unknown roles or packages', async () => {
    const res = await admin.get(
      `${base}/curricula/target?roleId=0190d5d0-0000-7000-8000-000000000000&bracketId=${ids.bracket('LPA_3_6')}`,
    );
    expect(res.statusCode).toBe(404);
  });
});
