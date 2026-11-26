/**
 * Puts the lesson library (hand-written lessons kept in the repo) into the database for review.
 * It never publishes: a person reviews and publishes every lesson in the admin console.
 *
 *  - No lesson yet for the subtopic: version 1 is created UNDER_REVIEW.
 *  - The working version is a library draft nobody has touched: it is refreshed in place.
 *  - The latest version is published (or archived) and the library changed: a new version is
 *    created UNDER_REVIEW, based on it, for the team to compare and publish.
 *  - Anything a person has started (a draft, an edit, a review) is left alone.
 */
import {
  canonicalJson,
  canonicalSection,
  type LessonDocument,
  type LessonDocumentInput,
} from '@app/content';
import type { Db, Prisma } from '../../../db/prisma.ts';
import { WORKING } from '../content.service.ts';
import { loadDocument, parseDocument, writeSections } from '../lesson-store.ts';

export interface LibraryLesson {
  topicSlug: string;
  subtopicSlug: string;
  document: LessonDocumentInput;
}

export const LIBRARY_NOTE =
  'Lesson library draft, written from the interview evidence. Check the facts, the tone and each depth before publishing.';

export type SyncOutcome =
  | 'created'
  | 'refreshed'
  | 'new-version'
  | 'unchanged'
  | 'skipped: subtopic missing'
  | 'skipped: a person is working on this lesson';

const fingerprint = (d: LessonDocument) =>
  canonicalJson({
    title: d.title,
    subtitle: d.subtitle ?? null,
    objectives: d.objectives,
    sections: d.sections.map(canonicalSection),
  });

export async function syncLessonLibrary(
  db: Db,
  library: LibraryLesson[],
  opts: { insertOnly?: boolean; now?: Date } = {},
) {
  const now = opts.now ?? new Date();
  const report: Array<{ lesson: string; outcome: SyncOutcome; version?: number }> = [];

  for (const item of library) {
    const name = `${item.topicSlug}/${item.subtopicSlug}`;
    const subtopic = await db.subtopic.findFirst({
      where: { slug: item.subtopicSlug, topic: { slug: item.topicSlug } },
      select: { id: true },
    });
    if (!subtopic) {
      report.push({ lesson: name, outcome: 'skipped: subtopic missing' });
      continue;
    }
    const document = await parseDocument(db, item.document);
    const module = await db.learningModule.findUnique({
      where: { subtopicId: subtopic.id },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { _count: { select: { reviews: true } } },
        },
      },
    });
    const versions = module?.versions ?? [];
    const latest = versions[0];

    const create = async (versionNumber: number, basedOnVersionId: string | null) => {
      await db.$transaction(async (tx) => {
        const mod =
          module ?? (await tx.learningModule.create({ data: { subtopicId: subtopic.id } }));
        const version = await tx.moduleVersion.create({
          data: {
            moduleId: mod.id,
            versionNumber,
            status: 'UNDER_REVIEW',
            origin: 'IMPORT',
            title: document.title,
            subtitle: document.subtitle ?? null,
            objectives: document.objectives as Prisma.InputJsonValue,
            basedOnVersionId,
            changeNote: LIBRARY_NOTE,
            submittedAt: now,
          },
        });
        await writeSections(tx, {
          moduleId: mod.id,
          versionId: version.id,
          sections: document.sections,
          origin: 'IMPORT',
          actorId: null,
        });
      });
    };

    if (!latest) {
      await create(1, null);
      report.push({ lesson: name, outcome: 'created', version: 1 });
      continue;
    }
    if (opts.insertOnly) {
      report.push({ lesson: name, outcome: 'unchanged', version: latest.versionNumber });
      continue;
    }

    const working = versions.find((v) => WORKING.includes(v.status));
    if (working) {
      const untouched =
        working.origin === 'IMPORT' &&
        working.changeNote === LIBRARY_NOTE &&
        working.createdById === null &&
        working.updatedById === null &&
        working._count.reviews === 0;
      if (!untouched) {
        report.push({ lesson: name, outcome: 'skipped: a person is working on this lesson' });
        continue;
      }
      const stored = await loadDocument(db, working.id);
      if (stored && fingerprint(stored.document) === fingerprint(document)) {
        report.push({ lesson: name, outcome: 'unchanged', version: working.versionNumber });
        continue;
      }
      await db.$transaction(async (tx) => {
        await tx.moduleVersion.update({
          where: { id: working.id },
          data: {
            title: document.title,
            subtitle: document.subtitle ?? null,
            objectives: document.objectives as Prisma.InputJsonValue,
            submittedAt: now,
            editSeq: { increment: 1 },
          },
        });
        await writeSections(tx, {
          moduleId: working.moduleId,
          versionId: working.id,
          sections: document.sections,
          origin: 'IMPORT',
          actorId: null,
        });
      });
      report.push({ lesson: name, outcome: 'refreshed', version: working.versionNumber });
      continue;
    }

    const base = versions.find((v) => v.status === 'PUBLISHED') ?? latest;
    const stored = await loadDocument(db, base.id);
    if (stored && fingerprint(stored.document) === fingerprint(document)) {
      report.push({ lesson: name, outcome: 'unchanged', version: base.versionNumber });
      continue;
    }
    await create(latest.versionNumber + 1, base.id);
    report.push({ lesson: name, outcome: 'new-version', version: latest.versionNumber + 1 });
  }
  return report;
}
