import type { ApiErrorBody, ErrorCode } from '@app/contracts';
import type { FastifyError, FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { AppError } from '../lib/errors.ts';

function body(
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: unknown,
): ApiErrorBody {
  return { error: { code, message, requestId, ...(details === undefined ? {} : { details }) } };
}

/** Maps every failure to the documented error envelope. Internal details never reach clients. */
export function registerErrorHandling(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError | AppError, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      const fields: Record<string, string> = {};
      for (const issue of err.validation) {
        const path = issue.instancePath.replace(/^\//, '').replaceAll('/', '.') || '_';
        fields[path] ??= issue.message ?? 'Invalid value';
      }
      return reply
        .status(400)
        .send(body('VALIDATION_ERROR', 'Please check the highlighted fields.', req.id, { fields }));
    }

    if (err instanceof AppError) {
      return reply.status(err.statusCode).send(body(err.code, err.message, req.id, err.details));
    }

    const status = err.statusCode ?? 500;
    if (status === 429) {
      return reply
        .status(429)
        .send(
          body('RATE_LIMITED', 'Too many attempts. Please wait a minute and try again.', req.id),
        );
    }
    if (status >= 400 && status < 500) {
      // Framework-level client errors: bad JSON, wrong content type, body too large, etc.
      const code: ErrorCode =
        status === 404 ? 'NOT_FOUND' : status === 401 ? 'UNAUTHENTICATED' : 'VALIDATION_ERROR';
      return reply.status(status).send(body(code, err.message, req.id));
    }

    req.log.error({ err }, 'unhandled error');
    return reply
      .status(500)
      .send(body('INTERNAL', 'Something went wrong on our side. Please try again.', req.id));
  });

  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send(body('NOT_FOUND', 'This endpoint does not exist.', req.id));
  });
}
