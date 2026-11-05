import type { ErrorCode } from '@app/contracts';

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  TOKEN_INVALID: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  ACCOUNT_SUSPENDED: 403,
  REGISTRATION_CLOSED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  EMAIL_TAKEN: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

/** An expected, user-facing failure. Anything else thrown is treated as an internal error. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = STATUS[code];
    this.details = details;
  }
}

export const unauthenticated = (message = 'Please sign in to continue.') =>
  new AppError('UNAUTHENTICATED', message);

export const forbidden = (message = 'You do not have access to this.') =>
  new AppError('FORBIDDEN', message);

export const notFound = (what = 'That item') => new AppError('NOT_FOUND', `${what} was not found.`);
