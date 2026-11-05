import {
  estimateSectionMinutes,
  gradeItem,
  type LessonDocument,
  lessonMinutes,
  resolveSections,
  type Section,
  type StudentSection,
  toStudentSection,
} from '@app/content';
import type {
  ContentIssue,
  LessonTargetDto,
  LessonVersionResponse,
  LessonVersionStatus,
} from '@app/contracts';
import { glossaryOf, type LessonRuntime } from '@app/learning-ui';
import { ApiError, type BadgeTone } from '@app/ui';

export const lessonKeys = {
  index: ['admin', 'lessons'] as const,
  module: (subtopicId: string) => ['admin', 'lessons', subtopicId] as const,
  version: (id: string) => ['admin', 'lesson-version', id] as const,
  feedback: (subtopicId: string) => ['admin', 'lessons', subtopicId, 'feedback'] as const,
};

export const STATUS: Record<LessonVersionStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  AI_GENERATED: { label: 'AI draft', tone: 'next' },
  UNDER_REVIEW: { label: 'In review', tone: 'warn' },
  APPROVED: { label: 'Approved', tone: 'next' },
  PUBLISHED: { label: 'Published', tone: 'live' },
  SUPERSEDED: { label: 'Superseded', tone: 'planned' },
  ARCHIVED: { label: 'Archived', tone: 'planned' },
};

export const PRIOR_KNOWLEDGE = [
  { value: 0, label: 'New to this' },
  { value: 1, label: 'Some idea' },
  { value: 2, label: 'Comfortable' },
  { value: 3, label: 'Confident' },
] as const;

export interface PreviewTarget {
  depth: number;
  roleSlug: string | null;
  skillLevel: number;
}

export interface ResolvedPreview {
  sections: StudentSection[];
  minutes: number;
  objectives: number;
}

/**
 * Exactly what a student with this target would see: the same @app/content resolution, the
 * same answer stripping, and the same renderers as the student app.
 */
export function resolvePreview(
  doc: LessonDocument,
  target: PreviewTarget,
  revisionOf: ReadonlyMap<string, string> = new Map(),
): ResolvedPreview {
  const resolved = resolveSections(doc.sections, {
    depth: target.depth,
    roleSlug: target.roleSlug,
    skillLevel: target.skillLevel,
  });
  const sections = resolved.map((s) =>
    toStudentSection(s, {
      revisionId: revisionOf.get(s.key) ?? `preview-${s.key}`,
      estimatedMinutes: estimateSectionMinutes(s),
      fastTrack: s.fastTrack,
    }),
  );
  return {
    sections,
    minutes: lessonMinutes(sections),
    objectives: doc.objectives.filter((o) => o.minDepthRank <= target.depth).length,
  };
}

/** Grades checks in the browser against the full document (admins can see answers anyway). */
export function previewRuntime(doc: LessonDocument): LessonRuntime {
  const byKey = new Map(doc.sections.map((s) => [s.key, s]));
  return {
    grade: async ({ sectionKey, itemKey, response }) => {
      const s = byKey.get(sectionKey);
      const item =
        s?.kind === 'KNOWLEDGE_CHECK' ? s.body.items.find((i) => i.key === itemKey) : undefined;
      const result = item ? gradeItem(item, response) : null;
      if (!result) throw new Error('This answer does not fit the question.');
      return result;
    },
    solution: async ({ sectionKey }) => {
      const s = byKey.get(sectionKey);
      return s?.kind === 'PLAYGROUND' ? s.body.solution : '';
    },
    attempts: new Map(),
    glossary: glossaryOf(doc.sections),
    storagePrefix: 'nwp-admin-preview',
  };
}

export const targetLabel = (t: LessonTargetDto) => `${t.roleTitle} · ${t.bracketLabel}`;

export const revisionMap = (v: LessonVersionResponse) =>
  new Map(v.sections.map((s) => [s.key, s.revisionId]));

/** The `{ issues }` a lesson validation error carries, if any. */
export function issuesOf(err: unknown): ContentIssue[] {
  if (!(err instanceof ApiError)) return [];
  const details = err.details as { issues?: ContentIssue[] } | undefined;
  return details?.issues ?? [];
}

export function sectionLabel(s: Pick<Section, 'key' | 'title' | 'kind'>) {
  return s.title ? `${s.title}` : s.key;
}

export function downloadJson(name: string, value: unknown) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
