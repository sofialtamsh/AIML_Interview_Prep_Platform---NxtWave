import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

/** Recreates the test database schema from the real migrations before the suite runs. */
export default async function setup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url?.includes('_test')) {
    throw new Error(`Refusing to reset a non-test database: ${url}`);
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  await client.end();

  execSync('npx prisma migrate deploy', {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  });
}
