import type { z } from 'zod';
import { ApiError } from './api';

export type FieldErrors = Record<string, string>;

/** Client-side check with the same Zod contract the server uses. */
export function validate<T extends z.ZodType>(
  schema: T,
  values: unknown,
): { ok: true; data: z.infer<T> } | { ok: false; errors: FieldErrors } {
  const r = schema.safeParse(values);
  if (r.success) return { ok: true, data: r.data };
  const errors: FieldErrors = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join('.') || '_';
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}

/** Splits a server error into per-field messages and a general message. */
export function fromApiError(err: unknown): { fields: FieldErrors; message: string | null } {
  if (err instanceof ApiError) {
    const hasFields = Object.keys(err.fields).length > 0;
    return { fields: err.fields, message: hasFields ? null : err.message };
  }
  return { fields: {}, message: 'Something went wrong. Please try again.' };
}

export function formValues(form: HTMLFormElement): Record<string, string> {
  return Object.fromEntries(
    [...new FormData(form).entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '']),
  );
}
