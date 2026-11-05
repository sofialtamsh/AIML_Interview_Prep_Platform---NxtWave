/**
 * Content Evaluation agent (docs/06 §3, step 6): computed checks first (code runs,
 * readability, word budgets, depth structure), then an AI reviewer scores the lesson against
 * the rubric. Failed code checks are always blocking, whatever the reviewer says.
 */
import {
  depthReport,
  EVAL_DIMENSIONS,
  EvaluationReport,
  llmJsonSchema,
  readabilityOf,
  STYLE_KEYS,
  type StyleKey,
  styleIssues,
} from '@app/content';
import type { EvaluationDto } from '@app/contracts';
import type { AppContext } from '../../../context.ts';
import type { Prisma } from '../../../db/prisma.ts';
import { notFound } from '../../../lib/errors.ts';
import { AiGateway, type Problem } from '../../ai/gateway.ts';
import type { JobRun } from '../../ai/jobs.service.ts';
import { loadDocument } from '../lesson-store.ts';
import { loadLessonContext } from './context.ts';
import { evaluateUser, evaluatorSystem, PROMPTS } from './prompts.ts';
import { verifyLessonCode } from './verify-code.ts';

export async function evaluateLesson(
  ctx: AppContext,
  run: JobRun,
  input: { moduleVersionId: string },
) {
  const loaded = await loadDocument(ctx.db, input.moduleVersionId);
  if (!loaded) throw notFound('That lesson version');
  const { document, version } = loaded;
  const module = await ctx.db.learningModule.findUniqueOrThrow({ where: { id: version.moduleId } });
  const lc = await loadLessonContext(ctx.db, module.subtopicId);
  const style: StyleKey = (STYLE_KEYS as readonly string[]).includes(version.style)
    ? (version.style as StyleKey)
    : 'standard';

  await run.stage('Running every piece of code', 10);
  const { checks } = await verifyLessonCode(document.sections, ctx.python);

  await run.stage('Measuring readability and structure', 30);
  const metrics: EvaluationDto['metrics'] & { depthReports: unknown } = {
    style,
    readability: document.sections.map(readabilityOf),
    styleIssues: document.sections.flatMap((s) => styleIssues(s, style)),
    codeChecks: checks,
    depthReports: lc.depths.map((d) => depthReport(document, d.rank)),
  };

  await run.stage('Reviewing with the AI evaluator', 45);
  const keys = new Set(document.sections.map((s) => s.key));
  const gateway = new AiGateway(ctx);
  const report = await gateway.run({
    task: 'LESSON_EVALUATION',
    prompt: PROMPTS.evaluate,
    system: evaluatorSystem(style),
    user: evaluateUser(lc, { style, lesson: document, metrics }),
    schema: EvaluationReport,
    jsonSchema: llmJsonSchema(EvaluationReport),
    check: (r) => {
      const problems: Problem[] = [];
      for (const d of EVAL_DIMENSIONS) {
        const n = r.scores.filter((s) => s.dimension === d).length;
        if (n !== 1)
          problems.push({ path: 'scores', message: `Score "${d}" exactly once (found ${n})` });
      }
      r.issues.forEach((i, n) => {
        if (i.sectionKey !== 'lesson' && !keys.has(i.sectionKey)) {
          problems.push({
            path: `issues.${n}.sectionKey`,
            message: `No step "${i.sectionKey}" (use a step key or "lesson")`,
          });
        }
      });
      return problems;
    },
    job: run,
  });

  await run.stage('Saving the report', 90);
  const issues: EvaluationDto['issues'] = [
    ...checks
      .filter((c) => c.status === 'failed')
      .map((c) => ({
        sectionKey: c.sectionKey,
        severity: 'blocking' as const,
        dimension: 'code_quality' as const,
        problem: `${c.target}: ${c.message}`,
        suggestion: 'Fix the code (or the marked answer) so it matches what Python really prints.',
        source: 'check' as const,
      })),
    ...report.issues.map((i) => ({ ...i, source: 'ai' as const })),
  ];
  const verdict = issues.some((i) => i.severity === 'blocking')
    ? 'BLOCKING_ISSUES'
    : issues.some((i) => i.severity === 'major') || report.verdict === 'needs_changes'
      ? 'NEEDS_CHANGES'
      : 'READY_FOR_REVIEW';
  const overall =
    Math.round((report.scores.reduce((a, s) => a + s.score, 0) / report.scores.length) * 10) / 10;
  const route = await gateway.route('LESSON_EVALUATION');
  const saved = await ctx.db.contentEvaluation.create({
    data: {
      moduleVersionId: input.moduleVersionId,
      jobId: run.jobId,
      model: ctx.ai?.name === 'simulated' ? 'simulated' : route.model,
      verdict,
      overall,
      scores: report.scores as Prisma.InputJsonValue,
      issues: issues as Prisma.InputJsonValue,
      summary: report.summary,
      metrics: metrics as unknown as Prisma.InputJsonValue,
    },
  });
  await run.log(
    'info',
    `Verdict: ${verdict.replaceAll('_', ' ').toLowerCase()} · overall ${overall}/5 · ${issues.length} issues`,
  );
  return { evaluationId: saved.id, verdict, overall, issues: issues.length };
}
