import { randomUUID } from 'node:crypto';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyBaseLogger } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import type { AppContext } from './context.ts';
import { registerErrorHandling } from './http/errors.ts';
import { registerOriginGuard } from './http/origin-guard.ts';
import { createServices } from './http/services.ts';
import { adminAccessRoutes } from './modules/access/admin-access.routes.ts';
import { adminAiRoutes } from './modules/ai/admin-ai.routes.ts';
import { adminAuthRoutes } from './modules/auth/admin-auth.routes.ts';
import { googleAuthRoutes } from './modules/auth/google.routes.ts';
import { studentAuthRoutes } from './modules/auth/student-auth.routes.ts';
import { adminCatalogRoutes } from './modules/catalog/admin-catalog.routes.ts';
import { adminContentRoutes } from './modules/content/admin-content.routes.ts';
import { studentLessonRoutes } from './modules/content/student-lesson.routes.ts';
import { adminCurriculumRoutes } from './modules/curriculum/admin-curriculum.routes.ts';
import { studentGoalsRoutes } from './modules/goals/student-goals.routes.ts';
import { healthRoutes } from './modules/health/health.routes.ts';
import { studentRoadmapRoutes } from './modules/roadmap/student-roadmap.routes.ts';
import { adminStudentsRoutes } from './modules/students/admin-students.routes.ts';
import { adminRoutes } from './modules/users/admin.routes.ts';
import { studentRoutes } from './modules/users/student.routes.ts';

export interface RouteInfo {
  method: string;
  url: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    /** Every registered route; used by the authorization matrix test. */
    routeIndex: RouteInfo[];
  }
}

export async function buildApp(ctx: AppContext) {
  const app = Fastify({
    loggerInstance: ctx.log as FastifyBaseLogger,
    trustProxy: ctx.env.TRUST_PROXY,
    bodyLimit: 1_048_576,
    // Never trust an incoming request id; generate our own.
    requestIdHeader: false,
    genReqId: () => randomUUID(),
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const routeIndex: RouteInfo[] = [];
  app.decorate('routeIndex', routeIndex);
  app.addHook('onRoute', (r) => {
    for (const method of [r.method].flat()) routeIndex.push({ method, url: r.url });
  });

  app.decorate('services', createServices(ctx));
  app.decorateRequest('auth', null);

  // The API only serves JSON, so a document CSP adds nothing here; the SPAs set their own CSP.
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cookie);
  if (ctx.env.RATE_LIMIT_ENABLED) {
    await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });
  }
  registerOriginGuard(app, ctx.env);
  registerErrorHandling(app);

  app.addHook('onSend', async (req, reply) => {
    reply.header('x-request-id', req.id);
  });

  if (ctx.env.NODE_ENV !== 'production') {
    await app.register(swagger, {
      openapi: {
        info: { title: `${ctx.env.APP_NAME} API`, version: '1.0.0' },
        tags: [
          { name: 'auth', description: 'Student authentication' },
          { name: 'student', description: 'Signed-in student data' },
          { name: 'admin-auth', description: 'Admin authentication' },
          { name: 'admin', description: 'Admin console' },
          { name: 'ops', description: 'Health and readiness' },
        ],
      },
      transform: jsonSchemaTransform,
    });
    await app.register(swaggerUi, { routePrefix: '/api/docs' });
  }

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(studentAuthRoutes, { prefix: '/api/v1/auth' });
  await app.register(googleAuthRoutes('STUDENT'), { prefix: '/api/v1/auth' });
  await app.register(studentRoutes, { prefix: '/api/v1/student' });
  await app.register(studentGoalsRoutes, { prefix: '/api/v1/student' });
  await app.register(studentRoadmapRoutes, { prefix: '/api/v1/student' });
  await app.register(studentLessonRoutes, { prefix: '/api/v1/student' });
  await app.register(adminAuthRoutes, { prefix: '/api/v1/admin/auth' });
  await app.register(googleAuthRoutes('ADMIN'), { prefix: '/api/v1/admin/auth' });
  await app.register(adminRoutes, { prefix: '/api/v1/admin' });
  await app.register(adminCatalogRoutes, { prefix: '/api/v1/admin/catalog' });
  await app.register(adminStudentsRoutes, { prefix: '/api/v1/admin/students' });
  await app.register(adminAccessRoutes, { prefix: '/api/v1/admin/access' });
  await app.register(adminCurriculumRoutes, { prefix: '/api/v1/admin/curriculum' });
  await app.register(adminContentRoutes, { prefix: '/api/v1/admin/content' });
  await app.register(adminAiRoutes, { prefix: '/api/v1/admin/ai' });

  return app;
}
