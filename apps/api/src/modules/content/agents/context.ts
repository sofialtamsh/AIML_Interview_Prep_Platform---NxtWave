import type { Db } from '../../../db/prisma.ts';
import { AppError, notFound } from '../../../lib/errors.ts';

/**
 * Everything an agent needs to know about one subtopic. Built only from the curriculum:
 * no student data ever goes into a prompt.
 */
export interface LessonContext {
  subtopic: { id: string; slug: string; title: string; summary: string; complexity: number };
  topic: { slug: string; title: string; summary: string };
  concepts: Array<{ key: string; name: string; description: string | null }>;
  /** Each published curriculum that includes this subtopic. */
  targets: Array<{
    role: string;
    roleSlug: string;
    bracket: string;
    depthRank: number;
    depthName: string;
    priority: string;
    objectives: string[];
    implementation: string | null;
    rationale: string | null;
  }>;
  /** The depths in use, deepest last, with what genuinely changes at each one. */
  depths: Array<{ rank: number; name: string; description: string; guidance: string }>;
  /** Taught earlier on the roadmap, so the lesson can build on them instead of re-teaching. */
  prerequisites: Array<{ title: string; topic: string }>;
}

const strings = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

export async function loadLessonContext(db: Db, subtopicId: string): Promise<LessonContext> {
  const subtopic = await db.subtopic.findUnique({
    where: { id: subtopicId },
    include: {
      topic: true,
      concepts: { orderBy: { sortOrder: 'asc' } },
      prerequisites: { include: { prerequisite: { include: { topic: true } } } },
      curriculumItems: {
        where: { curriculum: { status: 'PUBLISHED' } },
        include: { depth: true, curriculum: { include: { role: true, bracket: true } } },
      },
    },
  });
  if (!subtopic) throw notFound('That subtopic');
  if (subtopic.curriculumItems.length === 0) {
    throw new AppError(
      'CONFLICT',
      'No published curriculum includes this subtopic yet, so there is no depth to write for. Add it to a role curriculum and publish first.',
    );
  }
  const items = [...subtopic.curriculumItems].sort(
    (a, b) =>
      a.curriculum.role.sortOrder - b.curriculum.role.sortOrder ||
      a.curriculum.bracket.sortOrder - b.curriculum.bracket.sortOrder,
  );
  const ranks = [...new Set(items.map((i) => i.targetDepthRank))].sort((a, b) => a - b);
  const levels = await db.depthLevel.findMany({
    where: { rank: { in: ranks } },
    orderBy: { rank: 'asc' },
  });
  return {
    subtopic: {
      id: subtopic.id,
      slug: subtopic.slug,
      title: subtopic.title,
      summary: subtopic.summary,
      complexity: subtopic.complexity,
    },
    topic: {
      slug: subtopic.topic.slug,
      title: subtopic.topic.title,
      summary: subtopic.topic.summary,
    },
    concepts: subtopic.concepts.map((c) => ({
      key: c.key,
      name: c.name,
      description: c.description,
    })),
    targets: items.map((i) => ({
      role: i.curriculum.role.title,
      roleSlug: i.curriculum.role.slug,
      bracket: i.curriculum.bracket.label,
      depthRank: i.targetDepthRank,
      depthName: i.depth.name,
      priority: i.priority,
      objectives: strings(i.learningObjectives),
      implementation: i.implementationExpectation,
      rationale: i.rationale,
    })),
    depths: levels.map((l) => ({
      rank: l.rank,
      name: l.name,
      description: l.description,
      guidance: l.generationGuidance,
    })),
    prerequisites: subtopic.prerequisites.map((p) => ({
      title: p.prerequisite.title,
      topic: p.prerequisite.topic.title,
    })),
  };
}
