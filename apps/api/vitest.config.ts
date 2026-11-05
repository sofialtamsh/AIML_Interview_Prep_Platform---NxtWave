import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

const root = config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
const testDbUrl = process.env.DATABASE_URL_TEST ?? root.parsed?.DATABASE_URL_TEST;
if (!testDbUrl) throw new Error('DATABASE_URL_TEST must be set to run API tests');

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    // Integration tests share one database, so files run one at a time.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDbUrl,
      RATE_LIMIT_ENABLED: 'false',
      STUDENT_APP_URL: 'http://student.test',
      ADMIN_APP_URL: 'http://admin.test',
      REGISTRATION_POLICY_DEFAULT: 'OPEN',
      // Hermetic: never inherit a developer's Google settings from .env.
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
      ADMIN_GOOGLE_ALLOWED_DOMAINS: '',
    },
  },
});
