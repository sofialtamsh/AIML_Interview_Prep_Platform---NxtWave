import { AuthProviders } from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { isProd } from '../../config/env.ts';
import type { SessionAudience } from '../../generated/prisma/enums.ts';
import { requestMeta, setSessionCookie } from '../../http/auth.ts';
import { OAuthError } from './oauth.service.ts';

const perMinute = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } });

/**
 * "Continue with Google" for one audience. Mounted at /api/v1/auth (students) and
 * /api/v1/admin/auth (admins). Both endpoints are full-page browser navigations (302s).
 */
export function googleAuthRoutes(audience: SessionAudience): FastifyPluginAsyncZod {
  const flowCookie =
    audience === 'ADMIN'
      ? { name: 'nwp_aoauth', path: '/api/v1/admin/auth/google' }
      : { name: 'nwp_oauth', path: '/api/v1/auth/google' };
  const tags = [audience === 'ADMIN' ? 'admin-auth' : 'auth'];

  return async (app) => {
    const { oauth, settings } = app.services;

    app.get('/providers', { schema: { tags, response: { 200: AuthProviders } } }, async () => ({
      google: oauth.googleEnabled,
      registration: await settings.getRegistrationPolicy(),
    }));

    app.get(
      '/google/start',
      {
        config: perMinute(20),
        schema: { tags, querystring: z.object({ next: z.string().max(500).optional() }) },
      },
      async (req, reply) => {
        if (!oauth.googleEnabled)
          return reply.redirect(`${oauth.appUrl(audience)}/login?error=google_failed`);
        const { url, state } = await oauth.startGoogle(audience, req.query.next);
        // Binds this sign-in to this browser; checked against `state` in the callback.
        reply.setCookie(flowCookie.name, state, {
          path: flowCookie.path,
          httpOnly: true,
          sameSite: 'lax',
          secure: isProd,
          maxAge: 600,
        });
        return reply.redirect(url);
      },
    );

    app.get(
      '/google/callback',
      {
        config: perMinute(30),
        schema: {
          tags,
          querystring: z.object({
            state: z.string().max(200).optional(),
            code: z.string().max(2048).optional(),
            error: z.string().max(200).optional(),
          }),
        },
      },
      async (req, reply) => {
        const cookieState = req.cookies[flowCookie.name];
        reply.clearCookie(flowCookie.name, { path: flowCookie.path });
        try {
          const s = await oauth.completeGoogle(audience, req.query, cookieState, requestMeta(req));
          setSessionCookie(reply, audience, s.token, s.expiresAt, isProd);
          return reply.redirect(`${oauth.appUrl(audience)}${s.next}`);
        } catch (err) {
          if (!(err instanceof OAuthError)) req.log.error({ err }, 'google callback failed');
          const code = err instanceof OAuthError ? err.code : 'google_failed';
          return reply.redirect(`${oauth.appUrl(audience)}/login?error=${code}`);
        }
      },
    );
  };
}
