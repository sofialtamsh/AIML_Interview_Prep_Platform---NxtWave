/**
 * Loads the Hiring Intelligence export kept in the repo (apps/api/data/hiring-intelligence) when
 * the database has none yet. Insert-only: an existing snapshot, for example a newer one a super
 * admin uploaded, is never replaced.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { AppContext } from '../../context.ts';
import { HiringService } from './hiring.service.ts';

/** The data folder, found from this file in both the source tree and the built bundle. */
export function hiringDataDir(): string | null {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, 'data', 'hiring-intelligence');
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  return null;
}

/** The newest export in the folder (files are named hiring-<last interview date>.json[.gz]). */
export function latestHiringExport(dir = hiringDataDir()): string | null {
  if (!dir) return null;
  const files = readdirSync(dir)
    .filter((f) => /^hiring-.*\.json(\.gz)?$/.test(f))
    .sort()
    .reverse();
  return files[0] ? join(dir, files[0]) : null;
}

export function readHiringExport(path: string): unknown {
  const bytes = readFileSync(path);
  return JSON.parse((path.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString('utf8'));
}

export async function bootstrapHiringData(ctx: AppContext) {
  if ((await ctx.db.hiringSnapshot.count()) > 0) return { hiringSnapshot: 'kept' as const };
  const path = latestHiringExport();
  if (!path) return { hiringSnapshot: 'no file' as const };
  const result = await new HiringService(ctx).import(readHiringExport(path), null);
  return { hiringSnapshot: 'imported' as const, questions: result.snapshot.questions };
}
