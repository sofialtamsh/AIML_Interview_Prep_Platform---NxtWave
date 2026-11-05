import { createHash, randomBytes } from 'node:crypto';

/** 256-bit, URL-safe random token. Only its hash is ever stored. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
