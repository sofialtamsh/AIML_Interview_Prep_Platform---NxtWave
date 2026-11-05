import { LessonDocument, type Section } from '@app/content';
import { describe, expect, it } from 'vitest';
import { SandboxedPythonRunner } from '../../ai/python-runner.ts';
import { CHUNKING_STRATEGIES_LESSON } from '../exemplars/chunking-strategies.lesson.ts';
import { verifyLessonCode } from './verify-code.ts';

const python = new SandboxedPythonRunner({ snippetLimitMs: 5_000 });

describe('code verification in the sandbox', () => {
  it('reproduces every output of the reference lesson and finds nothing wrong', async () => {
    const doc = LessonDocument.parse(CHUNKING_STRATEGIES_LESSON);
    // Throw the recorded outputs away: the verifier must produce them again.
    const blanked = doc.sections.map((s) =>
      s.kind === 'CODE_EXAMPLE'
        ? ({ ...s, body: { ...s.body, expectedOutput: undefined } } as Section)
        : s,
    );
    const { sections, checks } = await verifyLessonCode(blanked, python);
    expect(checks.filter((c) => c.status !== 'ok')).toEqual([]);
    for (const [i, s] of sections.entries()) {
      const original = doc.sections[i] as Section;
      if (s.kind === 'CODE_EXAMPLE' && original.kind === 'CODE_EXAMPLE' && s.body.runnable) {
        expect(s.body.expectedOutput).toBe(original.body.expectedOutput);
      }
      if (s.kind === 'CODE_EXPLORER' && original.kind === 'CODE_EXPLORER') {
        expect(s.body.states.map((x) => x.output)).toEqual(
          original.body.states.map((x) => x.output),
        );
      }
    }
    // Every runnable example, explorer state, solution and predict question was checked.
    expect(checks.length).toBeGreaterThanOrEqual(8);
  }, 240_000);

  it('replaces claimed outputs, flags wrong answers and survives endless loops', async () => {
    const sections = [
      {
        key: 'code',
        kind: 'CODE_EXAMPLE',
        depthRank: 1,
        roleScope: [],
        conceptKeys: [],
        body: {
          language: 'python',
          code: 'print(2 + 2)',
          annotations: [],
          runnable: true,
          packages: [],
        },
      },
      {
        key: 'loop',
        kind: 'CODE_EXAMPLE',
        depthRank: 1,
        roleScope: [],
        conceptKeys: [],
        body: {
          language: 'python',
          code: 'while True:\n    pass',
          annotations: [],
          runnable: true,
          packages: [],
        },
      },
      {
        key: 'check',
        kind: 'KNOWLEDGE_CHECK',
        depthRank: 1,
        roleScope: [],
        conceptKeys: [],
        body: {
          items: [
            {
              key: 'p',
              type: 'predict_output',
              language: 'python',
              code: 'print(2 * 3)',
              options: [
                { id: 'a', text: '`5`' },
                { id: 'b', text: '`6`' },
              ],
              answer: { correct: ['a'] },
              explanation: 'Wrongly marked on purpose.',
            },
          ],
        },
      },
    ] as Section[];
    const { sections: out, checks } = await verifyLessonCode(sections, python);
    const first = out[0];
    expect(first?.kind === 'CODE_EXAMPLE' && first.body.expectedOutput).toBe('4');
    expect(checks.find((c) => c.sectionKey === 'loop')).toMatchObject({ status: 'failed' });
    expect(checks.find((c) => c.sectionKey === 'loop')?.message).toContain('Stopped after');
    expect(checks.find((c) => c.sectionKey === 'check')).toMatchObject({ status: 'failed' });
    expect(checks.find((c) => c.sectionKey === 'check')?.message).toContain('6');
  }, 240_000);
});
