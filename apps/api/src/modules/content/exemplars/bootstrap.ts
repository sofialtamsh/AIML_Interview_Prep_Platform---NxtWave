/**
 * Loads the reference lessons (golden exemplars) for review. Insert-only: a subtopic that
 * already has any lesson version is left alone. Exemplars arrive UNDER_REVIEW and are never
 * published automatically; a person approves and publishes them in the admin console.
 */
import { LessonDocument } from '@app/content';
import type { Db, Prisma } from '../../../db/prisma.ts';
import { parseDocument, writeSections } from '../lesson-store.ts';
import { CHUNKING_STRATEGIES_LESSON } from './chunking-strategies.lesson.ts';

export const EXEMPLARS = [
  { topicSlug: 'rag', subtopicSlug: 'chunking-strategies', document: CHUNKING_STRATEGIES_LESSON },
] as const;

export const EXEMPLAR_NOTE =
  'Reference lesson (golden exemplar). Check the facts, code and depth layers before publishing.';

export async function bootstrapExemplarLessons(db: Db, now: Date = new Date()) {
  let created = 0;
  for (const e of EXEMPLARS) {
    const subtopic = await db.subtopic.findFirst({
      where: { slug: e.subtopicSlug, topic: { slug: e.topicSlug } },
      include: { lesson: { include: { _count: { select: { versions: true } } } } },
    });
    if (!subtopic || (subtopic.lesson?._count.versions ?? 0) > 0) continue;
    const document = await parseDocument(db, LessonDocument.parse(e.document));
    await db.$transaction(async (tx) => {
      const module =
        subtopic.lesson ?? (await tx.learningModule.create({ data: { subtopicId: subtopic.id } }));
      const version = await tx.moduleVersion.create({
        data: {
          moduleId: module.id,
          versionNumber: 1,
          status: 'UNDER_REVIEW',
          origin: 'IMPORT',
          title: document.title,
          subtitle: document.subtitle ?? null,
          objectives: document.objectives as Prisma.InputJsonValue,
          changeNote: EXEMPLAR_NOTE,
          submittedAt: now,
        },
      });
      await writeSections(tx, {
        moduleId: module.id,
        versionId: version.id,
        sections: document.sections,
        origin: 'IMPORT',
        actorId: null,
      });
    });
    created++;
  }
  return { exemplarLessons: created };
}
