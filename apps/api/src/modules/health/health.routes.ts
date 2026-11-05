import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const Health = z.object({ status: z.literal('ok') });
const Ready = z.object({ status: z.enum(['ready', 'unavailable']), database: z.boolean() });

/** Liveness (process is up) and readiness (dependencies reachable) for load balancers. */
export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/health', { schema: { tags: ['ops'], response: { 200: Health } } }, async () => ({
    status: 'ok' as const,
  }));

  app.get(
    '/ready',
    { schema: { tags: ['ops'], response: { 200: Ready, 503: Ready } } },
    async (_req, reply) => {
      try {
        await app.services.ctx.db.$queryRaw`SELECT 1`;
        return { status: 'ready' as const, database: true };
      } catch {
        return reply.status(503).send({ status: 'unavailable' as const, database: false });
      }
    },
  );
};
