/**
 * Loads the lesson library (apps/api/src/modules/content/library) for review. Creates missing
 * lessons, refreshes library drafts nobody has touched, and opens a new review version when a
 * published lesson's library copy changed. Never publishes and never overwrites a person's work.
 *
 *   pnpm lessons:sync               every lesson
 *   pnpm lessons:sync self-introduction internship-experience   only these subtopics
 */
import { createAppContext } from '../bootstrap.ts';
import { LESSON_LIBRARY } from '../modules/content/library/index.ts';
import { syncLessonLibrary } from '../modules/content/library/sync.ts';

const only = process.argv.slice(2);
const ctx = createAppContext('lessons-sync');
try {
  const lessons = only.length
    ? LESSON_LIBRARY.filter((l) => only.includes(l.subtopicSlug))
    : LESSON_LIBRARY;
  for (const row of await syncLessonLibrary(ctx.db, lessons)) {
    console.log(
      `${row.outcome.padEnd(44)} ${row.lesson}${row.version ? ` (v${row.version})` : ''}`,
    );
  }
} catch (err) {
  console.error('✗ lesson sync failed', err);
  process.exitCode = 1;
} finally {
  await ctx.db.$disconnect();
}
