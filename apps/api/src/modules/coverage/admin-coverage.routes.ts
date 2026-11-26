import { CoverageQuery, CoverageResponse } from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authOf, requireAdmin } from '../../http/auth.ts';

const tags = ['admin-coverage'];

/**
 * /api/v1/admin/coverage — how ready the content is for one role and package. Every admin sees
 * the content side; the interview evidence is added for super admins only.
 */
export const adminCoverageRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireAdmin);
  const { coverage } = app.services;

  app.get(
    '/',
    { schema: { tags, querystring: CoverageQuery, response: { 200: CoverageResponse } } },
    (req) => coverage.view(req.query, { superAdmin: authOf(req).user.role === 'SUPER_ADMIN' }),
  );
};
