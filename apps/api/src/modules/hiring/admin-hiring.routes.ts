import {
  HiringFacetsQuery,
  HiringFacetsResponse,
  HiringImportResponse,
  HiringOpeningQuery,
  HiringOpeningsResponse,
  HiringOverviewResponse,
  HiringQuestionQuery,
  HiringQuestionsResponse,
} from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { actorOf, requireSuperAdmin } from '../../http/auth.ts';

const tags = ['admin-hiring'];

/** /api/v1/admin/hiring — the Hiring Intelligence data. Super admins only. */
export const adminHiringRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireSuperAdmin);
  const { hiring } = app.services;

  app.get('/', { schema: { tags, response: { 200: HiringOverviewResponse } } }, () =>
    hiring.overview(),
  );
  app.get(
    '/facets',
    { schema: { tags, querystring: HiringFacetsQuery, response: { 200: HiringFacetsResponse } } },
    (req) => hiring.facets(req.query.scope),
  );
  app.get(
    '/questions',
    {
      schema: {
        tags,
        querystring: HiringQuestionQuery,
        response: { 200: HiringQuestionsResponse },
      },
    },
    (req) => hiring.questions(req.query),
  );
  app.get(
    '/openings',
    {
      schema: { tags, querystring: HiringOpeningQuery, response: { 200: HiringOpeningsResponse } },
    },
    (req) => hiring.openings(req.query),
  );
  app.post(
    '/import',
    {
      // The dashboard export is a few MB of JSON; it is validated in full by the service.
      bodyLimit: 40 * 1_048_576,
      schema: { tags, body: z.unknown(), response: { 200: HiringImportResponse } },
    },
    (req) => hiring.import(req.body, actorOf(req)),
  );
};
