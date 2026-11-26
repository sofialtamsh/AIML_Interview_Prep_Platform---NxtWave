import type {
  HiringFacetsResponse,
  HiringImportResponse,
  HiringOpeningsResponse,
  HiringOverviewResponse,
  HiringQuestionsResponse,
} from '@app/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MLE_TOPICS } from '../src/modules/curriculum/mle-curriculum.ts';
import { PILOT_TOPICS } from '../src/modules/curriculum/pilot-curriculum.ts';
import { latestHiringExport, readHiringExport } from '../src/modules/hiring/hiring.bootstrap.ts';
import { decodeHiringExport } from '../src/modules/hiring/hiring-export.ts';
import { familyOf, PREP_TOPIC_SLUGS, themeOf } from '../src/modules/hiring/hiring-rules.ts';
import {
  ADMIN_ORIGIN,
  browser,
  createAdmin,
  createTestApp,
  errorCode,
  json,
  resetDb,
} from './helpers.ts';

const { app } = await createTestApp();
afterAll(async () => {
  await app.close();
});

/** A tiny export in the dashboard's format: two openings, five questions. */
function exportFixture(extraQuestion?: string) {
  // [opening, company, role, domain, skills, topic, subtopic, type, coding, round, difficulty, date, text]
  // biome-ignore format: one question per line mirrors the export
  const questions: unknown[][] = [
    [0, 0, 0, 0, [0], 0, 'Background', 0, 0, 0, 0, 0, 'Tell me about yourself.'],
    [0, 0, 0, 1, [1], 1, 'Overfitting', 1, 0, 1, 1, 1, 'What is overfitting and how do you reduce it?'],
    [0, 0, 0, 2, [2], 2, null, 2, 0, 1, 2, 1, 'Walk me through your RAG project end to end.'],
    [1, 1, 1, 3, [3], 3, 'Components', 1, 0, 1, -1, 1, 'What is the virtual DOM?'],
    [1, 1, 1, 0, [0], 0, 'Relocation', 0, 0, 0, 0, 0, 'Are you open to relocating to Pune?'],
  ];
  if (extraQuestion) questions.push([1, 1, 1, 0, [0], 0, '', 0, 0, 0, 0, 0, extraQuestion]);
  return {
    dicts: {
      round: ['HR Round', 'Technical Round 1'],
      company: ['Acme AI', 'Webly'],
      role: ['ML Engineer Intern', 'Frontend Developer'],
      domain: ['HR/General', 'AI/ML', 'GenAI', 'Frontend'],
      skill: ['General', 'Machine Learning', 'RAG', 'React'],
      topic: ['Candidate Background', 'Model Generalization', 'Project Implementation', 'React'],
      qtype: ['Behavioral', 'Conceptual', 'Projects Discussion'],
      coding: ['Not Applicable'],
      date: ['2026-03-02', '2026-03-03'],
    },
    opportunities: [
      {
        k: 'opp-1',
        byCompany: 0,
        co: 0,
        roles: [0],
        domains: [0, 1, 2],
        skills: [0, 1, 2],
        mn: 6,
        mx: 9,
        op: 4,
        from: '2026-03-02',
        to: '2026-03-03',
        nq: 3,
      },
      {
        k: 'opp-2',
        byCompany: 0,
        co: 1,
        roles: [1],
        domains: [0, 3],
        skills: [0, 3],
        mn: 4,
        mx: null,
        op: null,
        from: '2026-03-02',
        to: '2026-03-03',
        nq: 2,
      },
    ],
    questions,
    roundOrder: ['HR Round', 'Technical Round 1'],
    meta: {
      source: 'Test export',
      dateFrom: '2026-03-02',
      dateTo: '2026-03-03',
      companies: 2,
      openings: 4,
    },
  };
}

let n = 0;
async function signIn(role: 'ADMIN' | 'SUPER_ADMIN') {
  const creds = await createAdmin(`hiring${++n}@nxtwave.co.in`, 'Hiring-Data-2026!', role);
  const b = browser(app, ADMIN_ORIGIN);
  await b.post('/api/v1/admin/auth/login', creds);
  return b;
}

describe('Hiring Intelligence data', () => {
  let superAdmin: ReturnType<typeof browser>;
  beforeAll(async () => {
    await resetDb();
    superAdmin = await signIn('SUPER_ADMIN');
  });

  it('is for super admins only', async () => {
    const admin = await signIn('ADMIN');
    for (const url of ['/api/v1/admin/hiring', '/api/v1/admin/hiring/questions']) {
      expect((await admin.get(url)).statusCode, url).toBe(403);
    }
    const res = await admin.post('/api/v1/admin/hiring/import', exportFixture());
    expect(res.statusCode).toBe(403);
  });

  it('starts empty', async () => {
    const res = await superAdmin.get('/api/v1/admin/hiring');
    expect(res.statusCode).toBe(200);
    expect(json<HiringOverviewResponse>(res).snapshot).toBeNull();
  });

  it('rejects a file that is not an export', async () => {
    const res = await superAdmin.post('/api/v1/admin/hiring/import', { questions: [] });
    expect(res.statusCode).toBe(400);
    expect(errorCode(res)).toBe('VALIDATION_ERROR');
    const broken = exportFixture();
    (broken.questions[0] as unknown[])[1] = 99; // a company that does not exist
    const bad = await superAdmin.post('/api/v1/admin/hiring/import', broken);
    expect(bad.statusCode).toBe(400);
    expect(json<{ error: { message: string } }>(bad).error.message).toMatch(/missing company/);
  });

  it('imports an export, sorts questions into prep topics and finds them', async () => {
    const res = await superAdmin.post('/api/v1/admin/hiring/import', exportFixture());
    expect(res.statusCode).toBe(200);
    const body = json<HiringImportResponse>(res);
    expect(body.imported).toBe(true);
    expect(body.snapshot).toMatchObject({ questions: 5, opportunities: 2, companies: 2 });

    const overview = json<HiringOverviewResponse>(await superAdmin.get('/api/v1/admin/hiring'));
    // Only the ML Engineer opening counts towards the family.
    expect(overview.family).toMatchObject({ companies: 1, opportunities: 1, questions: 3 });
    expect(overview.family.companiesFrom8).toBe(1);
    expect(overview.topics.map((t) => t.slug).sort()).toEqual([
      'ml-fundamentals',
      'project-deep-dive',
      'self-introduction-hr',
    ]);
    expect(overview.topics.every((t) => t.share === 1 && t.shareFrom8 === 1)).toBe(true);

    const q = (query: string) =>
      superAdmin.get(`/api/v1/admin/hiring/questions?${query}`).then(json<HiringQuestionsResponse>);
    expect((await q('scope=ALL')).total).toBe(5);
    const hr = await q('scope=ALL&prepTopic=self-introduction-hr');
    expect(hr.items.map((i) => i.theme).sort()).toEqual([
      'Logistics: relocation, joining, CTC',
      'Self-introduction and background',
    ]);
    const outside = await q('scope=ALL&prepTopic=none');
    expect(outside.items.map((i) => i.text)).toEqual(['What is the virtual DOM?']);
    const search = await q('q=OVERFITTING');
    expect(search.items).toHaveLength(1);
    expect(search.items[0]).toMatchObject({
      difficulty: 'Medium',
      family: 'ML_TITLE',
      band: 'FROM_8_LPA',
    });

    const facets = json<HiringFacetsResponse>(
      await superAdmin.get('/api/v1/admin/hiring/facets?scope=ML_FAMILY'),
    );
    expect(facets.companies).toEqual([{ value: 'Acme AI', count: 3 }]);
    expect(facets.prepTopics.map((t) => t.slug).sort()).toEqual([
      'ml-fundamentals',
      'project-deep-dive',
      'self-introduction-hr',
    ]);

    const openings = json<HiringOpeningsResponse>(
      await superAdmin.get('/api/v1/admin/hiring/openings?scope=ALL&q=frontend'),
    );
    expect(openings.items.map((o) => o.company)).toEqual(['Webly']);
    expect(openings.items[0]).toMatchObject({ band: 'UNDER_8_LPA', family: null });
  });

  it('skips a file it already has and replaces the data with a new one', async () => {
    const again = json<HiringImportResponse>(
      await superAdmin.post('/api/v1/admin/hiring/import', exportFixture()),
    );
    expect(again.imported).toBe(false);
    const newer = json<HiringImportResponse>(
      await superAdmin.post(
        '/api/v1/admin/hiring/import',
        exportFixture('What are your salary expectations?'),
      ),
    );
    expect(newer.imported).toBe(true);
    const overview = json<HiringOverviewResponse>(await superAdmin.get('/api/v1/admin/hiring'));
    expect(overview.snapshot?.questions).toBe(6);
    expect(await app.services.ctx.db.hiringSnapshot.count()).toBe(1);
  });
});

describe('Hiring Intelligence rules', () => {
  it('points only at curriculum topics that exist', () => {
    const topics = new Set([...MLE_TOPICS, ...PILOT_TOPICS].map((t) => t.slug));
    expect(PREP_TOPIC_SLUGS.filter((s) => !topics.has(s))).toEqual([]);
  });

  it('sorts job titles into the ML Engineer family', () => {
    expect(familyOf('AI/ML Engineer Intern')).toBe('ML_TITLE');
    expect(familyOf('Data Scientist')).toBe('ML_TITLE');
    expect(familyOf('GenAI Developer')).toBe('AI_TITLE');
    expect(familyOf('Full Stack Developer with AI')).toBeNull();
    expect(familyOf('Prompt Engineer')).toBeNull();
  });

  it('keeps project questions apart from HR questions', () => {
    const base = {
      questionType: 'Conceptual',
      codingType: 'Not Applicable',
      subtopic: '',
      skills: [],
    };
    expect(
      themeOf({
        ...base,
        domain: 'HR/General',
        topic: 'Candidate Background',
        text: 'Introduce yourself',
      }),
    ).toEqual({ theme: 'Self-introduction and background', prepTopicSlug: 'self-introduction-hr' });
    expect(
      themeOf({ ...base, domain: 'HR/General', topic: 'Project Explanation', text: 'Explain it' })
        .prepTopicSlug,
    ).toBe('project-deep-dive');
    expect(
      themeOf({
        ...base,
        domain: 'GenAI',
        topic: 'Vector Search',
        text: 'What is cosine similarity?',
      }),
    ).toEqual({ theme: 'Embeddings and vector search', prepTopicSlug: 'embeddings-vector-search' });
  });

  it('reproduces the published evidence from the export kept in the repo', () => {
    const path = latestHiringExport();
    expect(path).toBeTruthy();
    const data = decodeHiringExport(readHiringExport(path as string));
    const family = data.questions.filter((q) => q.family);
    // docs/11-mle-interview-evidence.md: 3,293 questions from 72 companies.
    expect(family).toHaveLength(3293);
    expect(new Set(family.map((q) => q.company)).size).toBe(72);
    const asked = (slug: string) =>
      new Set(family.filter((q) => q.prepTopicSlug === slug).map((q) => q.company)).size;
    expect(asked('project-deep-dive')).toBe(66);
    expect(asked('python-for-interviews')).toBe(41);
  });
});
