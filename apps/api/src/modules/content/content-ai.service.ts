import type {
  AgentJobDto,
  EvaluationResponse,
  GenerateLessonBody,
  RewriteSectionBody,
} from '@app/contracts';
import type { AppContext } from '../../context.ts';
import { AppError, notFound } from '../../lib/errors.ts';
import { AI_QUEUES } from '../ai/job-queue.ts';
import { AgentJobService } from '../ai/jobs.service.ts';
import { loadLessonContext } from './agents/context.ts';
import { ContentService } from './content.service.ts';

interface Actor {
  id: string;
  ip: string | null;
}

/** Starts AI work on lessons. The work itself happens in the worker (agents/run-job.ts). */
export class ContentAiService {
  private readonly jobs: AgentJobService;
  private readonly content: ContentService;

  constructor(private readonly ctx: AppContext) {
    this.jobs = new AgentJobService(ctx);
    this.content = new ContentService(ctx);
  }

  private requireAi() {
    if (!this.ctx.ai) {
      throw new AppError(
        'CONFLICT',
        'AI generation is switched off. Add ANTHROPIC_API_KEY to the server environment and restart the API and worker.',
        { aiOff: true },
      );
    }
  }

  async generate(subtopicId: string, body: GenerateLessonBody, actor: Actor): Promise<AgentJobDto> {
    this.requireAi();
    // Fail fast with a clear message instead of a failed job.
    await loadLessonContext(this.ctx.db, subtopicId);
    await this.content.assertNoWorkingVersion(subtopicId);
    return this.jobs.create({
      type: 'LESSON_GENERATION',
      queue: AI_QUEUES.generate,
      input: {
        subtopicId,
        style: body.style ?? 'genz',
        ...(body.instructions ? { instructions: body.instructions } : {}),
        actorId: actor.id,
      },
      subtopicId,
      createdById: actor.id,
    });
  }

  async evaluate(versionId: string, actor: Actor): Promise<AgentJobDto> {
    this.requireAi();
    const version = await this.ctx.db.moduleVersion.findUnique({
      where: { id: versionId },
      include: { module: { select: { subtopicId: true } } },
    });
    if (!version) throw notFound('That lesson version');
    return this.jobs.create({
      type: 'LESSON_EVALUATION',
      queue: AI_QUEUES.evaluate,
      input: { moduleVersionId: versionId },
      subtopicId: version.module.subtopicId,
      moduleVersionId: versionId,
      createdById: actor.id,
    });
  }

  async rewrite(
    versionId: string,
    sectionKey: string,
    body: RewriteSectionBody,
    actor: Actor,
  ): Promise<AgentJobDto> {
    this.requireAi();
    const version = await this.ctx.db.moduleVersion.findUnique({
      where: { id: versionId },
      include: { module: { select: { subtopicId: true } } },
    });
    if (!version) throw notFound('That lesson version');
    if (version.status !== 'DRAFT' && version.status !== 'AI_GENERATED') {
      throw new AppError('CONFLICT', 'Only drafts can be rewritten. Start a new draft first.');
    }
    const pointer = await this.ctx.db.moduleVersionSection.findUnique({
      where: { moduleVersionId_sectionKey: { moduleVersionId: versionId, sectionKey } },
    });
    if (!pointer) throw notFound('That step');
    if (pointer.sectionRevisionId !== body.revisionId) {
      throw new AppError(
        'CONFLICT',
        'This step changed since you opened it. Reload and try again.',
        {
          stale: true,
        },
      );
    }
    return this.jobs.create({
      type: 'SECTION_REWRITE',
      queue: AI_QUEUES.rewrite,
      input: {
        moduleVersionId: versionId,
        sectionKey,
        revisionId: body.revisionId,
        presets: body.presets ?? [],
        ...(body.instruction ? { instruction: body.instruction } : {}),
        actorId: actor.id,
      },
      subtopicId: version.module.subtopicId,
      moduleVersionId: versionId,
      sectionKey,
      createdById: actor.id,
    });
  }

  async evaluation(versionId: string): Promise<EvaluationResponse> {
    const [evaluation, job] = await Promise.all([
      this.content.latestEvaluation(versionId),
      this.ctx.db.agentJob.findFirst({
        where: { moduleVersionId: versionId, type: 'LESSON_EVALUATION' },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      }),
    ]);
    return { evaluation, job: job ? await this.jobs.get(job.id) : null };
  }
}
