import { z } from 'zod';

/** Every error the API returns uses one of these codes (see docs/04-api-design.md §1). */
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INVALID_CREDENTIALS',
  'ACCOUNT_SUSPENDED',
  'EMAIL_TAKEN',
  'REGISTRATION_CLOSED',
  'TOKEN_INVALID',
  'INTERNAL',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const ApiErrorBody = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string().optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;

export const OkResponse = z.object({ ok: z.literal(true) });
export type OkResponse = z.infer<typeof OkResponse>;

export const PageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const pageOf = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
  });

export const UserRole = z.enum(['STUDENT', 'ADMIN', 'SUPER_ADMIN']);
export type UserRole = z.infer<typeof UserRole>;

export const RegistrationPolicy = z.enum(['OPEN', 'ALLOWLIST', 'INVITE_ONLY']);
export type RegistrationPolicy = z.infer<typeof RegistrationPolicy>;
