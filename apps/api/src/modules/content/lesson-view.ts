/**
 * How one student sees a published lesson: the same resolution the admin preview uses
 * (@app/content), applied to the revisions stored for the published version.
 */
import { estimateSectionMinutes, lessonMinutes, resolveSections, type Section } from '@app/content';
import type { LessonSummaryDto } from '@app/contracts';
import type { Db } from '../../db/prisma.ts';
import { loadSections, type StoredRevision } from './lesson-store.ts';

export interface ResolvedSection {
  section: Section;
  revision: StoredRevision;
  fastTrack: boolean;
  minutes: number;
}

export async function publishedLesson(db: Db, subtopicId: string) {
  const version = await db.moduleVersion.findFirst({
    where: { status: 'PUBLISHED', module: { subtopicId } },
  });
  if (!version) return null;
  return { version, sections: await loadSections(db, version.id) };
}

export function resolveFor(
  sections: Array<{ section: Section; revision: StoredRevision }>,
  opts: { depth: number; roleSlug: string | null; skillLevel: number },
): ResolvedSection[] {
  const byKey = new Map(sections.map((s) => [s.section.key, s]));
  return resolveSections(
    sections.map((s) => s.section),
    opts,
  ).flatMap((r) => {
    const stored = byKey.get(r.key);
    if (!stored) return [];
    return [
      {
        section: stored.section,
        revision: stored.revision,
        fastTrack: r.fastTrack,
        minutes: estimateSectionMinutes(stored.section),
      },
    ];
  });
}

export const minutesOf = (resolved: ResolvedSection[]) =>
  lessonMinutes(resolved.map((r) => ({ estimatedMinutes: r.minutes, fastTrack: r.fastTrack })));

/** Steps a student must finish to complete the lesson. Refreshers they already know are optional. */
export const requiredKeys = (resolved: ResolvedSection[]) =>
  resolved.filter((r) => !r.fastTrack).map((r) => r.section.key);

/** The lesson tile for each subtopic on the topic page, at this student's depth. */
export async function lessonSummaries(
  db: Db,
  studentId: string,
  roleSlug: string,
  items: Array<{ subtopicId: string; depthRank: number; skillLevel: number }>,
): Promise<Map<string, LessonSummaryDto>> {
  const ids = items.map((i) => i.subtopicId);
  const [versions, progress] = await Promise.all([
    db.moduleVersion.findMany({
      where: { status: 'PUBLISHED', module: { subtopicId: { in: ids } } },
      include: { module: { select: { subtopicId: true } } },
    }),
    db.moduleProgress.findMany({ where: { studentId, subtopicId: { in: ids } } }),
  ]);
  const out = new Map<string, LessonSummaryDto>();
  for (const v of versions) {
    const item = items.find((i) => i.subtopicId === v.module.subtopicId);
    if (!item) continue;
    const resolved = resolveFor(await loadSections(db, v.id), {
      depth: item.depthRank,
      roleSlug,
      skillLevel: item.skillLevel,
    });
    const p = progress.find((x) => x.subtopicId === item.subtopicId);
    const done = new Set(p?.completedSectionKeys ?? []);
    const required = requiredKeys(resolved);
    out.set(item.subtopicId, {
      minutes: minutesOf(resolved),
      sections: resolved.length,
      status: p?.status ?? 'NOT_STARTED',
      percent:
        p?.status === 'COMPLETED'
          ? 100
          : required.length
            ? Math.round((required.filter((k) => done.has(k)).length / required.length) * 100)
            : 0,
    });
  }
  return out;
}
