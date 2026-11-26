import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Environment lives in the repo root .env (shared by api, worker and tooling).
// Variables already set in the process (CI, tests) take precedence.
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // Generating the client needs no database, so a build without DATABASE_URL (Vercel installing
  // the whole workspace, CI) still works. Migrations and the seed fail clearly when it is unset.
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
