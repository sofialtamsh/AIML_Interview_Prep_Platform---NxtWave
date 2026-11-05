import type {
  AgentJobDto,
  AiStatusResponse,
  EvaluationResponse,
  LessonVersionResponse,
} from '@app/contracts';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { bootstrapAiConfig } from '../src/modules/ai/models.ts';
import { SimulatedProvider } from '../src/modules/ai/simulated.provider.ts';
import {
  type AiCallRequest,
  type AiCallResult,
  AiError,
  type AiProvider,
} from '../src/modules/ai/types.ts';
import { runAgentJob } from '../src/modules/content/agents/run-job.ts';
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

const clock = testClock(new Date('2026-11-05T05:00:00Z'));

/** Wraps the simulator so a test can make calls misbehave. */
class ScriptedProvider implements AiProvider {
  readonly name = 'simulated' as const;
  calls: AiCallRequest[] = [];
  constructor(
    private readonly script: (req: AiCallRequest, n: number) => Promise<AiCallResult | null> | null,
  ) {}
  private readonly inner = new SimulatedProvider();
  async call(req: AiCallRequest) {
    this.calls.push(req);
    return (await this.script(req, this.calls.length)) ?? this.inner.call(req);
  }
}

let provider = new ScriptedProvider(() => null);
const { app, ctx, jobs } = await createTestApp({
  now: clock.now,
  ai: { name: 'simulated', call: (req) => provider.call(req) },
});
afterAll(async () => {
  await app.close();
});

const CONTENT = '/api/v1/admin/content';
let admin: ReturnType<typeof browser>;
let chunking: string;

beforeEach(async () => {
  await resetWithCatalog();
  await bootstrapAiConfig(testDb());
  provider = new ScriptedProvider(() => null);
  jobs.take();
  const creds = await createAdmin('content@nxtwave.co.in', 'Content-Lead-2026', 'SUPER_ADMIN');
  admin = browser(app, ADMIN_ORIGIN, clock.now);
  expect((await admin.post('/api/v1/admin/auth/login', creds)).statusCode).toBe(200);
  chunking = (
    await testDb().subtopic.findFirstOrThrow({
      where: { slug: 'chunking-strategies', topic: { slug: 'rag' } },
    })
  ).id;
});

/** Runs everything the API queued, like the worker would, until nothing is left. */
async function drain() {
  for (let guard = 0; guard < 10; guard++) {
    const queued = jobs.take();
    if (queued.length === 0) return;
    for (const q of queued) await runAgentJob(ctx, q.jobId);
  }
}

const jobOf = async (id: string) =>
  json<AgentJobDto>(await admin.get(`/api/v1/admin/ai/jobs/${id}`));

async function generate(style = 'genz') {
  const res = await admin.post(`${CONTENT}/lessons/${chunking}/generate`, { style });
  expect(res.statusCode, res.body).toBe(202);
  return json<AgentJobDto>(res);
}

describe('AI lesson generation', () => {
  it('plans, writes, runs the code, saves an AI draft and evaluates it', async () => {
    const queued = await generate();
    expect(queued).toMatchObject({ type: 'LESSON_GENERATION', status: 'QUEUED' });
    await drain();

    const job = await jobOf(queued.id);
    expect(job.status, job.error ?? '').toBe('SUCCEEDED');
    expect(job.logs.map((l) => l.message)).toEqual(
      expect.arrayContaining(['Planning the lesson', 'Running every piece of code', 'Done']),
    );
    const versionId = job.output?.moduleVersionId as string;
    const v = json<LessonVersionResponse>(await admin.get(`${CONTENT}/versions/${versionId}`));
    expect(v.version).toMatchObject({
      status: 'AI_GENERATED',
      origin: 'AI',
      style: 'genz',
      editable: true,
    });
    // Depth layering is kept: 3–6 LPA (depth 2) and 8–12 LPA (depth 4) see different lessons.
    expect(v.depthReports.map((d) => [d.depth, d.sectionKeys.length])).toEqual([
      [2, 7],
      [4, 8],
    ]);
    // Real outputs, produced by running the code, never claimed by the writer.
    const code = v.document.sections.find((s) => s.key === 'code');
    expect(code?.kind === 'CODE_EXAMPLE' && code.body.expectedOutput).toBe(
      '1 notice the problem\n2 apply Chunking strategies\n3 check the result',
    );
    // Story cards with emoji.
    const bites = v.document.sections.find((s) => s.key === 'bites');
    expect(bites?.kind === 'CARD_DECK' && bites.body.layout).toBe('swipe');

    // Every revision records where it came from.
    const revisions = await testDb().sectionRevision.findMany({ where: { origin: 'AI' } });
    expect(revisions.length).toBe(v.sections.length);
    expect(
      revisions.every((r) => (r.generationMeta as { jobId?: string })?.jobId === queued.id),
    ).toBe(true);

    // The evaluation ran as a child job.
    expect(job.children).toEqual([
      expect.objectContaining({ type: 'LESSON_EVALUATION', status: 'SUCCEEDED' }),
    ]);
    const report = json<EvaluationResponse>(
      await admin.get(`${CONTENT}/versions/${versionId}/evaluation`),
    );
    expect(report.evaluation).toMatchObject({ verdict: 'READY_FOR_REVIEW', model: 'simulated' });
    expect(report.evaluation?.scores).toHaveLength(9);
    expect(report.evaluation?.metrics.codeChecks.every((c) => c.status === 'ok')).toBe(true);
    expect(report.evaluation?.metrics.readability.length).toBe(v.sections.length);

    // Every model call is recorded with its prompt version.
    const usage = await testDb().aiUsageRecord.findMany();
    expect(new Set(usage.map((u) => `${u.task}:${u.promptKey}@${u.promptVersion}`))).toEqual(
      new Set([
        'LESSON_PLAN:lesson.plan@1',
        'LESSON_DRAFT:lesson.draft@1',
        'LESSON_EVALUATION:lesson.evaluate@1',
      ]),
    );
    // Nothing reaches students until a person publishes it.
    expect(await testDb().moduleVersion.count({ where: { status: 'PUBLISHED' } })).toBe(0);

    // A second generation is refused while this draft is open.
    const again = await admin.post(`${CONTENT}/lessons/${chunking}/generate`, { style: 'genz' });
    expect(again.statusCode).toBe(409);
  }, 120_000);

  it('fixes invalid output with one repair, and fails clearly when it cannot', async () => {
    provider = new ScriptedProvider(async (req, n) =>
      n === 1 && req.task === 'LESSON_PLAN'
        ? { text: '{"title": "Oops"}', model: 'simulated', stopReason: 'end_turn', usage: zero }
        : null,
    );
    const ok = await generate();
    await drain();
    const job = await jobOf(ok.id);
    expect(job.status, job.error ?? '').toBe('SUCCEEDED');
    expect(job.logs.some((l) => l.message.startsWith('The lesson plan needed a fix'))).toBe(true);

    await testDb().moduleVersion.updateMany({ data: { status: 'ARCHIVED' } });
    provider = new ScriptedProvider(async (req) =>
      req.task === 'LESSON_PLAN'
        ? { text: 'not json', model: 'simulated', stopReason: 'end_turn', usage: zero }
        : null,
    );
    const bad = await generate();
    await drain();
    const failed = await jobOf(bad.id);
    expect(failed.status).toBe('FAILED');
    expect(failed.error).toContain('still had 1 problem(s) after one repair');
  }, 120_000);

  it('stops on refusals and on the budget, and records both', async () => {
    provider = new ScriptedProvider(async () => {
      throw new AiError('refused', 'The model declined this request. Try different instructions.');
    });
    const refused = await generate();
    await drain();
    expect(await jobOf(refused.id)).toMatchObject({
      status: 'FAILED',
      error: expect.stringContaining('declined'),
    });
    expect(await testDb().aiUsageRecord.count({ where: { status: 'REFUSED' } })).toBe(1);

    provider = new ScriptedProvider(() => null);
    await testDb().aiModelPricing.update({
      where: { model: 'simulated' },
      data: { inputPerMTok: 10_000, outputPerMTok: 10_000 },
    });
    const pricey = await generate();
    await drain();
    const job = await jobOf(pricey.id);
    expect(job.status).toBe('FAILED');
    expect(job.error).toContain('over its $5.00 budget');
    expect(provider.calls).toHaveLength(1); // stopped right after the first expensive call
  }, 120_000);

  it('cancels queued jobs and refuses generation without a curriculum or a key', async () => {
    const queued = await generate();
    const cancelled = json<AgentJobDto>(
      await admin.post(`/api/v1/admin/ai/jobs/${queued.id}/cancel`),
    );
    expect(cancelled.status).toBe('CANCELLED');
    await drain();
    expect((await jobOf(queued.id)).status).toBe('CANCELLED');
    expect(provider.calls).toHaveLength(0);

    const rag = await testDb().topic.findUniqueOrThrow({ where: { slug: 'rag' } });
    const orphan = await testDb().subtopic.create({
      data: {
        topicId: rag.id,
        slug: 'agentic-rag',
        title: 'Agentic RAG',
        summary: 'Agents that retrieve.',
      },
    });
    const res = await admin.post(`${CONTENT}/lessons/${orphan.id}/generate`, { style: 'genz' });
    expect(res.statusCode).toBe(409);
    expect(res.body).toContain('No published curriculum includes this subtopic');

    const off = await createTestApp({ now: clock.now, ai: null });
    try {
      const a = browser(off.app, ADMIN_ORIGIN, clock.now);
      await a.post('/api/v1/admin/auth/login', {
        email: 'content@nxtwave.co.in',
        password: 'Content-Lead-2026',
      });
      const r = await a.post(`${CONTENT}/lessons/${chunking}/generate`, { style: 'genz' });
      expect(r.statusCode).toBe(409);
      expect(r.body).toContain('ANTHROPIC_API_KEY');
      const status = json<AiStatusResponse>(await a.get('/api/v1/admin/ai/status'));
      expect(status).toMatchObject({ provider: null, keyConfigured: false });
    } finally {
      await off.app.close();
    }
  }, 120_000);
});

describe('AI step rewrite', () => {
  it('rewrites one step, keeps every other revision, and can be undone', async () => {
    await generate();
    await drain();
    const version = await testDb().moduleVersion.findFirstOrThrow({
      where: { status: 'AI_GENERATED' },
    });
    let v = json<LessonVersionResponse>(await admin.get(`${CONTENT}/versions/${version.id}`));
    const before = new Map(v.sections.map((s) => [s.key, s.revisionId]));
    const hook = v.sections.find((s) => s.key === 'hook');

    const stale = await admin.post(`${CONTENT}/versions/${version.id}/sections/hook/rewrite`, {
      presets: ['shorter'],
      revisionId: v.sections.find((s) => s.key === 'idea')?.revisionId,
    });
    expect(stale.statusCode).toBe(409);
    const empty = await admin.post(`${CONTENT}/versions/${version.id}/sections/hook/rewrite`, {
      presets: [],
      revisionId: hook?.revisionId,
    });
    expect(errorCode(empty)).toBe('VALIDATION_ERROR');

    const res = await admin.post(`${CONTENT}/versions/${version.id}/sections/hook/rewrite`, {
      presets: ['shorter', 'genz'],
      instruction: 'Use a cricket example',
      revisionId: hook?.revisionId,
    });
    expect(res.statusCode, res.body).toBe(202);
    const queued = json<AgentJobDto>(res);
    // One rewrite per step at a time.
    const twice = await admin.post(`${CONTENT}/versions/${version.id}/sections/hook/rewrite`, {
      presets: ['simpler'],
      revisionId: hook?.revisionId,
    });
    expect(twice.statusCode).toBe(409);
    await drain();
    const job = await jobOf(queued.id);
    expect(job.status, job.error ?? '').toBe('SUCCEEDED');

    v = json<LessonVersionResponse>(await admin.get(`${CONTENT}/versions/${version.id}`));
    const changed = v.sections.filter((s) => before.get(s.key) !== s.revisionId).map((s) => s.key);
    expect(changed).toEqual(['hook']);
    expect(v.document.sections.find((s) => s.key === 'hook')?.title).toBe(
      'Why Chunking strategies matters (rewritten)',
    );
    // The instruction reached the model with the presets.
    const rewriteCall = provider.calls.find((c) => c.task === 'SECTION_REWRITE');
    expect(rewriteCall?.user).toContain('Use a cricket example');
    expect(rewriteCall?.user).toContain('Make it shorter');

    // Undo: put the previous step back; identical content reuses the original revision.
    const previous = (job.output as { previous: unknown }).previous;
    const undo = await admin.put(`${CONTENT}/versions/${version.id}/sections/hook`, {
      editSeq: v.version.editSeq,
      section: previous,
    });
    expect(undo.statusCode, undo.body).toBe(200);
    expect(
      json<LessonVersionResponse>(undo).sections.find((s) => s.key === 'hook')?.revisionId,
    ).toBe(hook?.revisionId);
  }, 120_000);
});

describe('AI settings', () => {
  it('shows status and usage without keys, and lets only super admins change routes', async () => {
    let status = json<AiStatusResponse>(await admin.get('/api/v1/admin/ai/status'));
    expect(status).toMatchObject({ provider: 'simulated', keyConfigured: false, budgetUsd: 5 });
    expect(status.routes.map((r) => [r.task, r.model, r.effort])).toEqual([
      ['LESSON_PLAN', 'claude-opus-5-5', 'high'],
      ['LESSON_DRAFT', 'claude-opus-5-5', 'high'],
      ['LESSON_EVALUATION', 'claude-opus-5-5', 'high'],
      ['SECTION_REWRITE', 'claude-opus-5-5', 'high'],
    ]);
    expect(JSON.stringify(status)).not.toMatch(/sk-ant|api_key/i);

    const bad = await admin.put('/api/v1/admin/ai/routes/LESSON_EVALUATION', {
      model: 'gpt-something',
      effort: 'high',
      maxTokens: 32000,
    });
    expect(bad.statusCode).toBe(400);
    const res = await admin.put('/api/v1/admin/ai/routes/LESSON_EVALUATION', {
      model: 'claude-sonnet-5-5',
      effort: 'medium',
      maxTokens: 32000,
    });
    expect(res.statusCode).toBe(200);
    status = json<AiStatusResponse>(res);
    expect(status.routes.find((r) => r.task === 'LESSON_EVALUATION')).toMatchObject({
      model: 'claude-sonnet-5-5',
      effort: 'medium',
    });

    const creds = await createAdmin('editor@nxtwave.co.in', 'Content-Editor-2026', 'ADMIN');
    const editor = browser(app, ADMIN_ORIGIN, clock.now);
    await editor.post('/api/v1/admin/auth/login', creds);
    expect((await editor.get('/api/v1/admin/ai/status')).statusCode).toBe(200);
    const denied = await editor.put('/api/v1/admin/ai/routes/LESSON_PLAN', {
      model: 'claude-haiku-5-5',
      effort: 'low',
      maxTokens: 8000,
    });
    expect(denied.statusCode).toBe(403);
  });
});

const zero = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
