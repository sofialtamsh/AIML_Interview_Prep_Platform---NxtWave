import {
  depthReport,
  LessonDocument,
  type LessonDocumentInput,
  STYLES,
  styleIssues,
} from '@app/content';
import { beforeEach, describe, expect, it } from 'vitest';
import { LESSON_LIBRARY } from '../src/modules/content/library/index.ts';
import { LIBRARY_NOTE, syncLessonLibrary } from '../src/modules/content/library/sync.ts';
import {
  MLE_TOPICS,
  MLE_V1_CLASSICAL,
  MLE_V2_3_6,
  MLE_V2_8_12,
} from '../src/modules/curriculum/mle-curriculum.ts';
import {
  insertTaxonomy,
  LPA_3_6,
  LPA_8_12,
  PILOT_TOPICS,
} from '../src/modules/curriculum/pilot-curriculum.ts';
import { resetWithCatalog, testDb } from './helpers.ts';

// Library lessons serve the ML Engineer curricula and the AI Engineer pilot ones (Python & NumPy
// for AI); a topic such as RAG appears in both seeds with different subtopics.
const subtopicOf = (topicSlug: string, subtopicSlug: string) =>
  [...MLE_TOPICS, ...PILOT_TOPICS]
    .filter((t) => t.slug === topicSlug)
    .flatMap((t) => t.subtopics)
    .find((s) => s.slug === subtopicSlug);

/** The quality bar every library lesson meets before it reaches review. */
describe.each(LESSON_LIBRARY)('library lesson $topicSlug/$subtopicSlug', (lesson) => {
  const doc = LessonDocument.parse(lesson.document);
  const key = `${lesson.topicSlug}/${lesson.subtopicSlug}`;
  const depths = [
    MLE_V2_3_6[key]?.depth,
    MLE_V2_8_12[key]?.depth,
    MLE_V1_CLASSICAL[key]?.depth,
    LPA_3_6[key]?.depth,
    LPA_8_12[key]?.depth,
  ].filter((d): d is NonNullable<typeof d> => d !== undefined);

  it('belongs to a curriculum subtopic and uses only its concepts', () => {
    const subtopic = subtopicOf(lesson.topicSlug, lesson.subtopicSlug);
    expect(subtopic, key).toBeDefined();
    const concepts = new Set(subtopic?.concepts.map(([k]) => k));
    const used = new Set(doc.sections.flatMap((s) => s.conceptKeys));
    expect([...used].filter((k) => !concepts.has(k))).toEqual([]);
    // Every concept of the subtopic is taught somewhere.
    expect([...concepts].filter((k) => !used.has(k))).toEqual([]);
    expect(depths.length).toBeGreaterThan(0);
  });

  it('meets the title rule and the standard style budgets', () => {
    const issues = doc.sections.flatMap((s) => styleIssues(s, 'standard'));
    expect(issues).toEqual([]);
    expect(STYLES.standard.budgets.sentenceWords).toBe(22);
  });

  it('gives every code slide a spoken explanation, in plain words', () => {
    const slides = doc.sections.flatMap((s) =>
      s.kind === 'SLIDES'
        ? s.body.slides.map((sl) => ({ where: `${s.key}: ${sl.title}`, sl }))
        : [],
    );
    const silent = slides.filter(({ sl }) => sl.visual?.type === 'code' && !sl.narration);
    expect(silent.map((x) => x.where)).toEqual([]);
    // A script is heard, not read: no markdown, code marks or symbols a voice would stumble on.
    const marked = slides.filter(
      ({ sl }) => sl.narration && /[`*_#{}[\]<>→≥≤×÷₹]/.test(sl.narration),
    );
    expect(marked.map((x) => x.where)).toEqual([]);
  });

  it('is complete at every depth the curricula teach it', () => {
    for (const depth of new Set(depths)) {
      const report = depthReport(doc, depth);
      expect(
        report.checks.filter((c) => !c.ok).map((c) => c.message),
        `depth ${depth}`,
      ).toEqual([]);
      // One sitting: 45 minutes, or 50 with an interactive explorer (2026-11-18).
      // A V1 guided lab unit teaches one algorithm to interview depth, and on 2026-11-20 the product
      // owner asked for "as much time as needed" there, so those units only have a sanity limit.
      const hasExplorer = doc.sections.some((s) => s.kind === 'WIDGET');
      const guidedLab = doc.sections.some(
        (s) => s.kind === 'WIDGET' && 'story' in s.body && s.body.story.length > 0,
      );
      expect(report.minutes).toBeLessThanOrEqual(guidedLab ? 90 : hasExplorer ? 50 : 45);
    }
  });
});

describe('lesson library sync', () => {
  const item = LESSON_LIBRARY[0] as (typeof LESSON_LIBRARY)[number];
  const edited = (title: string): typeof item => ({
    ...item,
    document: { ...(item.document as LessonDocumentInput), title },
  });
  const versions = () =>
    testDb().moduleVersion.findMany({
      where: { module: { subtopic: { slug: item.subtopicSlug } } },
      orderBy: { versionNumber: 'asc' },
    });

  beforeEach(async () => {
    await resetWithCatalog();
    await insertTaxonomy(testDb(), MLE_TOPICS);
  });

  it('creates a lesson for review, never publishes it, and is idempotent', async () => {
    expect(await syncLessonLibrary(testDb(), [item])).toEqual([
      { lesson: `${item.topicSlug}/${item.subtopicSlug}`, outcome: 'created', version: 1 },
    ]);
    const [v1] = await versions();
    expect(v1).toMatchObject({
      status: 'UNDER_REVIEW',
      origin: 'IMPORT',
      changeNote: LIBRARY_NOTE,
    });
    expect((await syncLessonLibrary(testDb(), [item]))[0]?.outcome).toBe('unchanged');
  });

  it('refreshes an untouched library draft in place', async () => {
    await syncLessonLibrary(testDb(), [item]);
    expect(
      (await syncLessonLibrary(testDb(), [edited('Self-introduction, refreshed')]))[0]?.outcome,
    ).toBe('refreshed');
    const all = await versions();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ title: 'Self-introduction, refreshed', status: 'UNDER_REVIEW' });
  });

  it('leaves a draft alone once a person has touched it', async () => {
    await syncLessonLibrary(testDb(), [item]);
    const [v1] = await versions();
    const admin = await testDb().user.create({
      data: { email: 'reviewer@nxtwave.co.in', role: 'ADMIN', status: 'ACTIVE' },
    });
    await testDb().moduleVersion.update({
      where: { id: v1?.id },
      data: { updatedById: admin.id },
    });
    expect((await syncLessonLibrary(testDb(), [edited('Changed')]))[0]?.outcome).toBe(
      'skipped: a person is working on this lesson',
    );
    expect((await versions())[0]?.title).toBe(item.document.title);
  });

  it('opens a new review version when a published lesson changes in the library', async () => {
    await syncLessonLibrary(testDb(), [item]);
    const [v1] = await versions();
    await testDb().moduleVersion.update({
      where: { id: v1?.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    expect((await syncLessonLibrary(testDb(), [item]))[0]?.outcome).toBe('unchanged');
    expect((await syncLessonLibrary(testDb(), [edited('Self-introduction v2')]))[0]).toMatchObject({
      outcome: 'new-version',
      version: 2,
    });
    const [first, second] = await versions();
    expect(first?.status).toBe('PUBLISHED');
    expect(second).toMatchObject({ status: 'UNDER_REVIEW', basedOnVersionId: first?.id });
  });
});
