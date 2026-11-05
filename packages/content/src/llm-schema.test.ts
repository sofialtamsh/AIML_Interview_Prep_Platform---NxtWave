import { describe, expect, it } from 'vitest';
import {
  EvaluationReport,
  fromGenSection,
  GenSectionBatch,
  LessonDocument,
  LessonPlan,
  llmJsonSchema,
  Section,
  toGenSection,
} from './index';

/** Keys the structured-output API rejects anywhere in a schema. */
function problems(schema: unknown, path = '$'): string[] {
  if (Array.isArray(schema)) return schema.flatMap((s, i) => problems(s, `${path}[${i}]`));
  if (!schema || typeof schema !== 'object') return [];
  const node = schema as Record<string, unknown>;
  const out: string[] = [];
  for (const bad of [
    'oneOf',
    'prefixItems',
    'minLength',
    'maxLength',
    'minimum',
    'maximum',
    'pattern',
    'default',
  ]) {
    if (bad in node) out.push(`${path}: ${bad}`);
  }
  if (node.type === 'object' && node.additionalProperties !== false)
    out.push(`${path}: open object`);
  for (const [k, v] of Object.entries(node)) {
    // Inside "properties" the keys are field names (a field may be called "default").
    if (k === 'properties' && v && typeof v === 'object') {
      for (const [name, sub] of Object.entries(v)) out.push(...problems(sub, `${path}.${name}`));
    } else {
      out.push(...problems(v, `${path}.${k}`));
    }
  }
  return out;
}

describe('structured-output schemas', () => {
  it('only uses what the API accepts (closed objects, no tuples or maps, no limits)', () => {
    for (const schema of [LessonPlan, GenSectionBatch, EvaluationReport]) {
      expect(problems(llmJsonSchema(schema))).toEqual([]);
    }
  });

  it('round-trips every real step through the AI-friendly shape', async () => {
    const { CHUNKING_STRATEGIES_LESSON } = await import(
      '../../../apps/api/src/modules/content/exemplars/chunking-strategies.lesson'
    );
    const doc = LessonDocument.parse(CHUNKING_STRATEGIES_LESSON);
    for (const s of doc.sections) {
      const gen = toGenSection(s);
      const back = Section.parse(fromGenSection(gen));
      if (s.kind === 'CODE_EXAMPLE' && back.kind === 'CODE_EXAMPLE') {
        // Real outputs come from running code, never from the round trip.
        expect(back.body.expectedOutput).toBeUndefined();
        expect({ ...back, body: { ...back.body, expectedOutput: s.body.expectedOutput } }).toEqual(
          s,
        );
      } else {
        expect(back).toEqual(s);
      }
    }
  });
});
