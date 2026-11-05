import { LessonDocument, resolveSections } from '@app/content';
import { describe, expect, it } from 'vitest';
import { CHUNKING_STRATEGIES_LESSON } from './chunking-strategies.lesson.ts';

describe('golden exemplar: Chunking strategies', () => {
  const doc = LessonDocument.parse(CHUNKING_STRATEGIES_LESSON);
  const at = (depth: number) =>
    resolveSections(doc.sections, { depth, roleSlug: null, skillLevel: 0 }).map((s) => s.key);

  it('is valid lesson content', () => {
    expect(doc.sections.length).toBe(22);
  });

  it('is depth-layered: 3–6 LPA (Beginner) and 8–12 LPA (Advanced) see different lessons', () => {
    expect(at(2)).toEqual([
      'hook',
      'why',
      'diagram.pipeline',
      'code.fixed-size',
      'explore.size-overlap',
      'callout.units',
      'check.basics',
      'callout.say-tradeoff',
      'interview.basic',
      'summary.basic',
    ]);
    const advanced = at(4);
    expect(advanced).toHaveLength(20);
    expect(advanced).toContain('interview.production');
    expect(advanced).toContain('summary.advanced');
    expect(advanced).not.toContain('interview.basic');
  });

  it('shows real outputs for runnable code', () => {
    for (const s of doc.sections) {
      if (s.kind === 'CODE_EXAMPLE' && s.body.runnable) expect(s.body.expectedOutput).toBeTruthy();
    }
  });
});
