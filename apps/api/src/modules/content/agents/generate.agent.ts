/**
 * Content Generation agent (docs/06 §3): plan → write steps in batches → run every piece of
 * code → save as an AI draft → queue the evaluator. The draft is never published by itself.
 */
import {
  checkPlan,
  fromGenSection,
  GenSectionBatch,
  LessonDocument,
  LessonPlan,
  llmJsonSchema,
  Section,
  STYLES,
  type StyleKey,
} from '@app/content';
import type { AppContext } from '../../../context.ts';
import type { Prisma } from '../../../db/prisma.ts';
import { AiGateway, type Problem } from '../../ai/gateway.ts';
import { AI_QUEUES } from '../../ai/job-queue.ts';
import { AgentJobService, type JobRun } from '../../ai/jobs.service.ts';
import { AiError } from '../../ai/types.ts';
import { ContentService } from '../content.service.ts';
import { loadLessonContext } from './context.ts';
import { draftUser, PROMPTS, planUser, writerSystem } from './prompts.ts';
import { verifyLessonCode } from './verify-code.ts';

export interface GenerateInput {
  subtopicId: string;
  style: StyleKey;
  instructions?: string;
  actorId: string | null;
}

/** Steps written per call: small enough to stay focused, large enough to stay coherent. */
const BATCH = 5;

export async function generateLesson(ctx: AppContext, run: JobRun, input: GenerateInput) {
  const gateway = new AiGateway(ctx);
  const content = new ContentService(ctx);

  await run.stage('Reading the curriculum', 2);
  const lc = await loadLessonContext(ctx.db, input.subtopicId);
  await content.assertNoWorkingVersion(input.subtopicId);
  const depths = lc.depths.map((d) => d.rank);
  const deepest = Math.max(...depths);
  const conceptKeys = lc.concepts.map((c) => c.key);
  const system = writerSystem(input.style);

  // 1. Plan
  await run.stage('Planning the lesson', 5);
  const plan = await gateway.run({
    task: 'LESSON_PLAN',
    prompt: PROMPTS.plan,
    system,
    user: planUser(lc, input),
    schema: LessonPlan,
    jsonSchema: llmJsonSchema(LessonPlan),
    check: (p) => [
      ...checkPlan(p, { depths, conceptKeys, maxSections: 30 }),
      ...p.sections.flatMap((s, i) =>
        s.depthRank > deepest
          ? [
              {
                path: `sections.${i}.depthRank`,
                message: `No depth in use is deeper than ${deepest}`,
              },
            ]
          : [],
      ),
      ...p.objectives.flatMap((o, i) =>
        o.minDepthRank > deepest
          ? [
              {
                path: `objectives.${i}.minDepthRank`,
                message: `No depth in use is deeper than ${deepest}`,
              },
            ]
          : [],
      ),
    ],
    job: run,
  });
  await run.log('info', `Planned ${plan.sections.length} steps`, {
    steps: plan.sections.map((s) => `${s.key} · ${s.kind} · depth ${s.depthRank}`),
  });

  // 2. Write the steps in batches
  const keys = plan.sections.map((s) => s.key);
  const batches = Array.from({ length: Math.ceil(keys.length / BATCH) }, (_, i) =>
    keys.slice(i * BATCH, (i + 1) * BATCH),
  );
  const written: Section[] = [];
  for (const [i, batch] of batches.entries()) {
    await run.stage(
      `Writing steps (part ${i + 1} of ${batches.length})`,
      10 + (60 * i) / batches.length,
    );
    const result = await gateway.run({
      task: 'LESSON_DRAFT',
      prompt: PROMPTS.draft,
      system,
      user: draftUser(lc, {
        style: input.style,
        instructions: input.instructions,
        plan,
        batch,
        written: written.map((s) => ({ key: s.key, title: s.title ?? s.key })),
      }),
      schema: GenSectionBatch,
      jsonSchema: llmJsonSchema(GenSectionBatch),
      check: (b) => checkBatch(b, batch, plan, new Set(conceptKeys)),
      job: run,
    });
    written.push(...result.sections.map((g) => Section.parse(fromGenSection(g))));
  }

  // 3. Run every piece of code; real outputs replace claimed ones
  await run.stage('Running every piece of code', 72);
  const { sections, checks } = await verifyLessonCode(written, ctx.python);
  const failed = checks.filter((c) => c.status === 'failed');
  await run.log(
    failed.length ? 'warn' : 'info',
    `Code checks: ${checks.length - failed.length} passed, ${failed.length} failed`,
    {
      checks,
    },
  );

  const doc = LessonDocument.safeParse({
    title: plan.title,
    ...(plan.subtitle ? { subtitle: plan.subtitle } : {}),
    objectives: plan.objectives,
    sections,
  });
  if (!doc.success) {
    throw new AiError('invalid_output', 'The assembled lesson is not valid.', {
      problems: doc.error.issues
        .slice(0, 20)
        .map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  // 4. Save as an AI draft, with provenance on every step
  await run.stage('Saving the AI draft', 86);
  const route = await gateway.route('LESSON_DRAFT');
  const model = ctx.ai?.name === 'simulated' ? 'simulated' : route.model;
  const meta: Record<string, Prisma.InputJsonValue> = Object.fromEntries(
    doc.data.sections.map((s) => [
      s.key,
      {
        jobId: run.jobId,
        prompt: `${PROMPTS.draft.key}@${PROMPTS.draft.version}`,
        model,
        style: input.style,
        codeChecks: checks.filter((c) => c.sectionKey === s.key),
      } as unknown as Prisma.InputJsonValue,
    ]),
  );
  const moduleVersionId = await content.saveAiDraft(input.subtopicId, doc.data, {
    style: input.style,
    jobId: run.jobId,
    actorId: input.actorId,
    changeNote: `AI draft (${STYLES[input.style].label})${input.instructions ? `: ${input.instructions.slice(0, 200)}` : ''}`,
    meta,
  });

  // 5. Hand it to the evaluator
  await run.stage('Queueing the evaluation', 94);
  const evaluation = await new AgentJobService(ctx).create({
    type: 'LESSON_EVALUATION',
    queue: AI_QUEUES.evaluate,
    input: { moduleVersionId },
    subtopicId: input.subtopicId,
    moduleVersionId,
    parentJobId: run.jobId,
    createdById: input.actorId,
  });
  return {
    moduleVersionId,
    steps: doc.data.sections.length,
    codeChecks: { passed: checks.length - failed.length, failed: failed.length },
    evaluationJobId: evaluation.id,
    costUsd: Math.round(run.spentUsd * 10_000) / 10_000,
  };
}

/** A written batch must be exactly the planned steps, each valid on its own. */
function checkBatch(
  b: GenSectionBatch,
  batch: string[],
  plan: LessonPlan,
  concepts: ReadonlySet<string>,
): Problem[] {
  const problems: Problem[] = [];
  const got = b.sections.map((s) => s.key);
  if (got.join('|') !== batch.join('|')) {
    problems.push({
      path: 'sections',
      message: `Return exactly these steps in this order: ${batch.join(', ')} (got ${got.join(', ') || 'none'})`,
    });
  }
  b.sections.forEach((g, i) => {
    const planned = plan.sections.find((p) => p.key === g.key);
    if (planned && planned.kind !== g.kind) {
      problems.push({
        path: `sections.${i}.kind`,
        message: `The plan says ${planned.kind} for "${g.key}"`,
      });
    }
    if (planned && planned.depthRank !== g.depthRank) {
      problems.push({
        path: `sections.${i}.depthRank`,
        message: `The plan says depth ${planned.depthRank}`,
      });
    }
    if (planned && (planned.slotKey ?? null) !== (g.slotKey ?? null)) {
      problems.push({
        path: `sections.${i}.slotKey`,
        message: `The plan says slot ${planned.slotKey ?? 'none'}`,
      });
    }
    for (const c of g.conceptKeys) {
      if (!concepts.has(c))
        problems.push({ path: `sections.${i}.conceptKeys`, message: `Unknown concept "${c}"` });
    }
    const parsed = Section.safeParse(fromGenSection(g));
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        problems.push({ path: `sections.${i}.${issue.path.join('.')}`, message: issue.message });
      }
    }
  });
  return problems;
}
