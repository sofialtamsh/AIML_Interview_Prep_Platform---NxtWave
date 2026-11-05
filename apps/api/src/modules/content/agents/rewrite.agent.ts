/**
 * Section Regeneration agent (docs/06 §2): rewrites ONE step of a draft with an instruction
 * ("shorter", "more Gen Z", a reviewer's note…). Every other step keeps its revision; the old
 * step is returned so the admin can undo with one click.
 */
import {
  fromGenSection,
  GenSection,
  LessonDocument,
  llmJsonSchema,
  Section,
  STYLE_KEYS,
  type StyleKey,
  toGenSection,
} from '@app/content';
import type { RewritePreset } from '@app/contracts';
import type { AppContext } from '../../../context.ts';
import type { Prisma } from '../../../db/prisma.ts';
import { AppError, notFound } from '../../../lib/errors.ts';
import { AiGateway, type Problem } from '../../ai/gateway.ts';
import type { JobRun } from '../../ai/jobs.service.ts';
import { ContentService } from '../content.service.ts';
import { loadDocument } from '../lesson-store.ts';
import { loadLessonContext } from './context.ts';
import { PROMPTS, REWRITE_PRESETS, rewriteUser, writerSystem } from './prompts.ts';
import { verifyLessonCode } from './verify-code.ts';

export interface RewriteInput {
  moduleVersionId: string;
  sectionKey: string;
  revisionId: string;
  presets: RewritePreset[];
  instruction?: string;
  actorId: string;
}

export async function rewriteSection(ctx: AppContext, run: JobRun, input: RewriteInput) {
  const loaded = await loadDocument(ctx.db, input.moduleVersionId);
  if (!loaded) throw notFound('That lesson version');
  const { version, document, sections } = loaded;
  if (version.status !== 'DRAFT' && version.status !== 'AI_GENERATED') {
    throw new AppError('CONFLICT', 'Only drafts can be rewritten.');
  }
  const current = sections.find((s) => s.section.key === input.sectionKey);
  if (!current) throw notFound('That step');
  if (current.revision.id !== input.revisionId) {
    throw new AppError(
      'CONFLICT',
      'This step changed after the rewrite was requested. Try again on the latest version.',
    );
  }
  const module = await ctx.db.learningModule.findUniqueOrThrow({ where: { id: version.moduleId } });
  const lc = await loadLessonContext(ctx.db, module.subtopicId);
  const style: StyleKey = (STYLE_KEYS as readonly string[]).includes(version.style)
    ? (version.style as StyleKey)
    : 'standard';

  // Reviewer notes and evaluator findings on this step give the rewrite something concrete to fix.
  const [review, evaluation] = await Promise.all([
    ctx.db.contentReview.findFirst({
      where: { moduleVersionId: input.moduleVersionId },
      orderBy: { createdAt: 'desc' },
    }),
    ctx.db.contentEvaluation.findFirst({
      where: { moduleVersionId: input.moduleVersionId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  const notes = [
    ...Object.entries((review?.sectionNotes ?? {}) as Record<string, string>)
      .filter(([k]) => k === input.sectionKey)
      .map(([, note]) => `Reviewer: ${note}`),
    ...(
      (evaluation?.issues ?? []) as Array<{
        sectionKey: string;
        problem: string;
        suggestion: string;
      }>
    )
      .filter((i) => i.sectionKey === input.sectionKey)
      .map((i) => `Evaluator: ${i.problem} Suggested: ${i.suggestion}`),
  ];
  const instruction = [
    ...input.presets.map((p) => REWRITE_PRESETS[p]),
    ...(input.instruction ? [input.instruction] : []),
  ].join('\n');

  await run.stage(`Rewriting "${current.section.title ?? input.sectionKey}"`, 15);
  const concepts = new Set(lc.concepts.map((c) => c.key));
  const gen = await new AiGateway(ctx).run({
    task: 'SECTION_REWRITE',
    prompt: PROMPTS.rewrite,
    system: writerSystem(style),
    user: rewriteUser(lc, {
      style,
      outline: document.sections.map((s) => ({
        key: s.key,
        kind: s.kind,
        title: s.title ?? s.key,
        depthRank: s.depthRank,
      })),
      current: toGenSection(current.section),
      instruction,
      notes,
    }),
    schema: GenSection,
    jsonSchema: llmJsonSchema(GenSection),
    check: (g) => {
      const problems: Problem[] = [];
      if (g.key !== input.sectionKey)
        problems.push({ path: 'key', message: `Keep the key "${input.sectionKey}"` });
      for (const c of g.conceptKeys) {
        if (!concepts.has(c))
          problems.push({ path: 'conceptKeys', message: `Unknown concept "${c}"` });
      }
      const parsed = Section.safeParse(fromGenSection(g));
      if (!parsed.success) {
        for (const i of parsed.error.issues)
          problems.push({ path: i.path.join('.'), message: i.message });
        return problems;
      }
      const whole = LessonDocument.safeParse({
        ...document,
        sections: document.sections.map((s) => (s.key === input.sectionKey ? parsed.data : s)),
      });
      if (!whole.success) {
        for (const i of whole.error.issues)
          problems.push({ path: i.path.join('.'), message: i.message });
      }
      return problems;
    },
    job: run,
  });

  // Run its code, with the earlier examples it may build on.
  await run.stage('Running the code', 70);
  const rewritten = Section.parse(fromGenSection(gen));
  const index = document.sections.findIndex((s) => s.key === input.sectionKey);
  const context = document.sections
    .slice(0, index)
    .filter((s) => s.kind === 'CODE_EXAMPLE' && s.body.runnable);
  const { sections: verified, checks } = await verifyLessonCode(
    [...context, rewritten],
    ctx.python,
  );
  const final = verified.at(-1) as Section;
  const mine = checks.filter((c) => c.sectionKey === input.sectionKey);

  await run.stage('Saving the new version of the step', 90);
  const newRevisionId = await new ContentService(ctx).applyAiRewrite(input.moduleVersionId, final, {
    baseRevisionId: input.revisionId,
    actorId: input.actorId,
    meta: {
      jobId: run.jobId,
      prompt: `${PROMPTS.rewrite.key}@${PROMPTS.rewrite.version}`,
      instruction,
      codeChecks: mine,
    } as unknown as Prisma.InputJsonValue,
  });
  return {
    sectionKey: input.sectionKey,
    previous: current.section,
    newRevisionId,
    codeChecks: mine,
  };
}
