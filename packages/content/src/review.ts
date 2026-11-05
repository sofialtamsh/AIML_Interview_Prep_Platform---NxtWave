/**
 * A reviewer's checklist: what each depth of a lesson actually contains. It never blocks
 * publishing; it tells the reviewer where to look (docs/05 §1.3, docs/08 lesson anatomy).
 */
import { estimateSectionMinutes, lessonMinutes, resolveSections } from './engine';
import type { LessonDocument, Section } from './schema';

export interface DepthCheck {
  key: 'hook' | 'interactive' | 'check' | 'summary' | 'outputs';
  ok: boolean;
  message: string;
}

export interface DepthReport {
  depth: number;
  sectionKeys: string[];
  minutes: number;
  objectives: number;
  checks: DepthCheck[];
}

const INTERACTIVE = new Set<Section['kind']>(['CODE_EXPLORER', 'WIDGET', 'PLAYGROUND']);

export function depthReport(doc: LessonDocument, depth: number, roleSlug: string | null = null) {
  const sections = resolveSections(doc.sections, { depth, roleSlug, skillLevel: 0 });
  const minutes = lessonMinutes(
    sections.map((s) => ({ estimatedMinutes: estimateSectionMinutes(s), fastTrack: false })),
  );
  const missingOutputs = sections.filter(
    (s) => s.kind === 'CODE_EXAMPLE' && s.body.runnable && !s.body.expectedOutput,
  );
  const item = (key: DepthCheck['key'], ok: boolean, yes: string, no: string): DepthCheck => ({
    key,
    ok,
    message: ok ? yes : no,
  });
  const checks: DepthCheck[] = [
    item(
      'hook',
      sections[0]?.kind === 'HOOK',
      'Opens with a hook',
      'Does not open with a hook. Start from a relatable problem.',
    ),
    item(
      'interactive',
      sections.some(
        (s) => INTERACTIVE.has(s.kind) || (s.kind === 'CODE_EXAMPLE' && s.body.runnable),
      ),
      'Has something to explore or try',
      'Nothing to explore or try at this depth',
    ),
    item(
      'check',
      sections.some((s) => s.kind === 'KNOWLEDGE_CHECK'),
      'Has a knowledge check',
      'No knowledge check at this depth',
    ),
    item(
      'summary',
      sections.at(-1)?.kind === 'SUMMARY',
      'Ends with a summary',
      'Does not end with a summary',
    ),
    item(
      'outputs',
      missingOutputs.length === 0,
      'Runnable code shows its real output',
      `Runnable code without a verified output: ${missingOutputs.map((s) => s.key).join(', ')}`,
    ),
  ];
  return {
    depth,
    sectionKeys: sections.map((s) => s.key),
    minutes,
    objectives: doc.objectives.filter((o) => o.minDepthRank <= depth).length,
    checks,
  } satisfies DepthReport;
}
