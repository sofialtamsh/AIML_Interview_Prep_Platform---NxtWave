import { hash, verify } from '@node-rs/argon2';

// OWASP Password Storage Cheat Sheet: Argon2id, m=19 MiB, t=2, p=1 (Argon2id is the library default).
const ARGON2_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 };

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Spend the same time as a real verification when the account does not exist,
 * so response timing does not reveal which emails are registered.
 */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword('timing-equalizer-not-a-real-password');
  await verifyPassword(await dummyHash, password);
}
