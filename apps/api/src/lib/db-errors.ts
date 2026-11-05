/** Prisma error code P2002: a unique constraint was violated. */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';
}

/** Prisma error code P2025: the record to update/delete does not exist. */
export function isNotFound(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2025';
}

/** Prisma error code P2003: a foreign key blocks the change (e.g. the row is still referenced). */
export function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2003';
}
