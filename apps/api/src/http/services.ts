import type { AppContext } from '../context.ts';
import { AccessService } from '../modules/access/access.service.ts';
import { AiService } from '../modules/ai/ai.service.ts';
import { AuditService } from '../modules/audit/audit.service.ts';
import { AuthService } from '../modules/auth/auth.service.ts';
import { OAuthService } from '../modules/auth/oauth.service.ts';
import { CatalogService } from '../modules/catalog/catalog.service.ts';
import { ContentService } from '../modules/content/content.service.ts';
import { ContentAiService } from '../modules/content/content-ai.service.ts';
import { LessonService } from '../modules/content/lesson.service.ts';
import { CurriculumService } from '../modules/curriculum/curriculum.service.ts';
import { GoalsService } from '../modules/goals/goals.service.ts';
import { RoadmapService } from '../modules/roadmap/roadmap.service.ts';
import { SettingsService } from '../modules/settings/settings.service.ts';
import { StudentsService } from '../modules/students/students.service.ts';

/** Service container attached to the Fastify instance. Routes stay thin and call these. */
export function createServices(ctx: AppContext) {
  const roadmaps = new RoadmapService(ctx);
  return {
    ctx,
    auth: new AuthService(ctx),
    oauth: new OAuthService(ctx),
    audit: new AuditService(ctx),
    settings: new SettingsService(ctx),
    catalog: new CatalogService(ctx),
    goals: new GoalsService(ctx),
    students: new StudentsService(ctx),
    access: new AccessService(ctx),
    curriculum: new CurriculumService(ctx),
    roadmaps,
    content: new ContentService(ctx),
    contentAi: new ContentAiService(ctx),
    ai: new AiService(ctx),
    lessons: new LessonService(ctx, roadmaps),
  };
}

export type Services = ReturnType<typeof createServices>;

declare module 'fastify' {
  interface FastifyInstance {
    services: Services;
  }
}
