import { describe, expect, it } from 'vitest';
import {
  type CheckItem,
  canonicalJson,
  canonicalSection,
  depthReport,
  estimateSectionMinutes,
  gradeItem,
  isFastTrack,
  LessonDocument,
  resolveSections,
  Section,
  toStudentSection,
} from './index';

const hook = (key: string, depthRank: number, extra: Record<string, unknown> = {}) =>
  Section.parse({
    key,
    kind: 'HOOK',
    depthRank,
    body: { scenario: 'A customer asks about refunds.', bridge: 'That is why we chunk.' },
    ...extra,
  });
const note = (key: string, depthRank: number, extra: Record<string, unknown> = {}) =>
  Section.parse({
    key,
    kind: 'EXPLANATION',
    depthRank,
    body: { blocks: [{ type: 'paragraph', text: `Section ${key}` }] },
    ...extra,
  });

describe('schema', () => {
  it('rejects HTML in rich text and unknown widgets', () => {
    expect(
      Section.safeParse({
        key: 'x',
        kind: 'EXPLANATION',
        depthRank: 1,
        body: { blocks: [{ type: 'paragraph', text: 'Hi <script>alert(1)</script>' }] },
      }).success,
    ).toBe(false);
    expect(
      Section.safeParse({
        key: 'w',
        kind: 'WIDGET',
        depthRank: 1,
        body: { widget: 'iframe', params: {} },
      }).success,
    ).toBe(false);
    // Comparisons like "a < b" are fine.
    expect(
      note('ok', 1, { body: { blocks: [{ type: 'paragraph', text: 'If a < b then…' }] } }).key,
    ).toBe('ok');
  });

  it('requires a code-explorer state for every control combination', () => {
    const base = {
      key: 'e',
      kind: 'CODE_EXPLORER',
      depthRank: 2,
      body: {
        controls: [
          {
            id: 'how',
            label: 'Join',
            options: [
              { value: 'inner', label: 'inner' },
              { value: 'left', label: 'left' },
            ],
          },
        ],
        states: [
          {
            when: { how: 'inner' },
            code: 'x',
            output: { kind: 'text', value: '1' },
            verdict: { tone: 'ok', text: 'Good' },
          },
        ],
        defaultState: { how: 'inner' },
      },
    };
    expect(Section.safeParse(base).success).toBe(false);
    base.body.states.push({
      when: { how: 'left' },
      code: 'y',
      output: { kind: 'text', value: '2' },
      verdict: { tone: 'bad', text: 'Bad' },
    });
    expect(Section.safeParse(base).success).toBe(true);
  });

  it('checks answers against the options, and lesson-level key and slot rules', () => {
    expect(
      Section.safeParse({
        key: 'c',
        kind: 'KNOWLEDGE_CHECK',
        depthRank: 1,
        body: {
          items: [
            {
              key: 'q',
              type: 'mcq',
              prompt: 'Pick one',
              options: [
                { id: 'a', text: 'A' },
                { id: 'b', text: 'B' },
              ],
              answer: { correct: ['z'] },
              explanation: 'Because.',
            },
          ],
        },
      }).success,
    ).toBe(false);

    const doc = (sections: unknown[]) =>
      LessonDocument.safeParse({
        title: 'T',
        objectives: [{ key: 'o', text: 'Do it', minDepthRank: 1 }],
        sections,
      });
    expect(doc([note('a', 1), note('a', 2)]).success).toBe(false); // duplicate key
    expect(doc([note('a', 2, { slotKey: 's' }), note('b', 2, { slotKey: 's' })]).success).toBe(
      false,
    ); // same slot depth
    expect(doc([note('a', 1, { slotKey: 's' }), note('b', 4, { slotKey: 's' })]).success).toBe(
      true,
    );
  });
});

describe('depth resolution', () => {
  const sections = [
    hook('hook', 1),
    note('basics', 1),
    note('how', 2),
    note('tradeoffs', 4),
    note('summary.basic', 1, { slotKey: 'summary' }),
    note('summary.deep', 4, { slotKey: 'summary' }),
    note('ml-only', 2, { roleScope: ['ml-engineer'] }),
  ];

  it('keeps sections at or below the depth, and only the deepest slot variant', () => {
    const at = (depth: number) =>
      resolveSections(sections, { depth, roleSlug: 'ai-engineer', skillLevel: 0 }).map(
        (s) => s.key,
      );
    expect(at(2)).toEqual(['hook', 'basics', 'how', 'summary.basic']);
    expect(at(4)).toEqual(['hook', 'basics', 'how', 'tradeoffs', 'summary.deep']);
  });

  it('applies role scope', () => {
    const keys = resolveSections(sections, {
      depth: 2,
      roleSlug: 'ml-engineer',
      skillLevel: 0,
    }).map((s) => s.key);
    expect(keys).toContain('ml-only');
  });

  it('fast-tracks basics for confident students without removing anything', () => {
    const confident = resolveSections(sections, { depth: 4, roleSlug: null, skillLevel: 3 });
    expect(confident.filter((s) => s.fastTrack).map((s) => s.key)).toEqual(['basics', 'how']);
    expect(confident).toHaveLength(5);
    // Hooks are never fast-tracked; comfortable students only skim foundations.
    expect(isFastTrack({ kind: 'HOOK', depthRank: 1 }, 4, 3)).toBe(false);
    expect(isFastTrack({ kind: 'EXPLANATION', depthRank: 1 }, 4, 2)).toBe(true);
    expect(isFastTrack({ kind: 'EXPLANATION', depthRank: 2 }, 4, 2)).toBe(false);
    expect(isFastTrack({ kind: 'EXPLANATION', depthRank: 1 }, 4, 1)).toBe(false);
  });
});

describe('grading and answer stripping', () => {
  const items: CheckItem[] = [
    {
      key: 'm',
      type: 'mcq',
      prompt: 'p',
      options: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
      answer: { correct: ['b'] },
      explanation: 'B is right.',
    },
    {
      key: 'mm',
      type: 'multi',
      prompt: 'p',
      options: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
        { id: 'c', text: 'C' },
      ],
      answer: { correct: ['a', 'c'] },
      explanation: 'A and C.',
    },
    {
      key: 'f',
      type: 'fill_blank',
      template: 'Use {{b1}}.',
      answer: { b1: ['cumcount', 'groupby.cumcount'] },
      explanation: 'cumcount numbers rows.',
    },
    {
      key: 'o',
      type: 'order_steps',
      prompt: 'p',
      steps: [
        { id: 's1', text: '1' },
        { id: 's2', text: '2' },
        { id: 's3', text: '3' },
      ],
      answer: { order: ['s1', 's2', 's3'] },
      explanation: 'In order.',
    },
    {
      key: 'r',
      type: 'reasoning',
      prompt: 'Explain',
      modelAnswer: 'Model answer.',
      rubric: ['Mentions X'],
    },
  ];
  const [mcq, multi, fill, order, reasoning] = items as [
    CheckItem,
    CheckItem,
    CheckItem,
    CheckItem,
    CheckItem,
  ];

  it('grades each type on the server and reveals only afterwards', () => {
    expect(gradeItem(mcq, { type: 'mcq', choice: 'b' })).toMatchObject({
      correct: true,
      reveal: { correct: ['b'] },
    });
    expect(gradeItem(mcq, { type: 'mcq', choice: 'a' })?.correct).toBe(false);
    expect(gradeItem(multi, { type: 'multi', choices: ['c', 'a'] })?.correct).toBe(true);
    expect(gradeItem(multi, { type: 'multi', choices: ['a'] })?.correct).toBe(false);
    // Forgiving about case, quotes and a trailing "()".
    expect(gradeItem(fill, { type: 'fill_blank', blanks: { b1: ' `CumCount()` ' } })?.correct).toBe(
      true,
    );
    expect(gradeItem(fill, { type: 'fill_blank', blanks: { b1: 'rank' } })?.correct).toBe(false);
    expect(gradeItem(order, { type: 'order_steps', order: ['s1', 's3', 's2'] })?.correct).toBe(
      false,
    );
    expect(
      gradeItem(reasoning, { type: 'reasoning', text: 'My take', selfRating: 'got_it' }),
    ).toEqual({
      correct: true,
      reveal: { modelAnswer: 'Model answer.', rubric: ['Mentions X'] },
    });
    // A written answer first reveals the model answer; the self-rating comes after.
    expect(gradeItem(reasoning, { type: 'reasoning', text: 'My take' })?.correct).toBeNull();
    // A response of the wrong type is not graded.
    expect(gradeItem(mcq, { type: 'multi', choices: ['b'] })).toBeNull();
  });

  it('never sends answers, explanations, model answers or solutions to the student', () => {
    const check = Section.parse({
      key: 'c',
      kind: 'KNOWLEDGE_CHECK',
      depthRank: 1,
      body: { items },
    });
    const playground = Section.parse({
      key: 'p',
      kind: 'PLAYGROUND',
      depthRank: 2,
      body: {
        language: 'python',
        instructions: 'Print hi',
        starterCode: '# your code',
        solution: 'print("hi")',
        checks: [{ type: 'stdout_contains', value: 'hi', label: 'Says hi' }],
      },
    });
    const json = JSON.stringify(
      [check, playground].map((s) =>
        toStudentSection(s, { revisionId: 'r', estimatedMinutes: 1, fastTrack: false }),
      ),
    );
    for (const secret of [
      '"answer"',
      '"explanation"',
      '"modelAnswer"',
      '"rubric"',
      '"solution"',
      'B is right',
      'print(\\"hi\\")',
    ]) {
      expect(json).not.toContain(secret);
    }
    // Ordering steps are shuffled (deterministically) so the answer order isn't given away.
    const student = toStudentSection(check, {
      revisionId: 'r',
      estimatedMinutes: 1,
      fastTrack: false,
    });
    const steps =
      student.kind === 'KNOWLEDGE_CHECK' && student.body.items[3]?.type === 'order_steps'
        ? student.body.items[3].steps.map((s) => s.id)
        : [];
    expect(steps).toHaveLength(3);
    expect(steps).not.toEqual(['s1', 's2', 's3']);
  });
});

describe('time estimates', () => {
  it('uses reading time plus activity time, at least one minute', () => {
    expect(estimateSectionMinutes(note('tiny', 1))).toBe(1);
    const deck = Section.parse({
      key: 'd',
      kind: 'CARD_DECK',
      depthRank: 1,
      body: {
        layout: 'flip',
        cards: Array.from({ length: 6 }, (_, i) => ({ title: `Card ${i}`, front: 'Front text' })),
      },
    });
    expect(estimateSectionMinutes(deck)).toBe(3); // 6 × 30 s of interaction
    expect(estimateSectionMinutes(note('fixed', 1, { estimatedMinutes: 7 }))).toBe(7);
  });
});

describe('canonical form and the reviewer checklist', () => {
  it('serialises the same content the same way however it was authored', () => {
    const a = note('x', 1, { conceptKeys: ['b.c', 'a.b', 'a.b'], roleScope: ['ml-engineer'] });
    const b = note('x', 1, { roleScope: ['ml-engineer'], conceptKeys: ['a.b', 'b.c'] });
    expect(canonicalJson(canonicalSection(a))).toBe(canonicalJson(canonicalSection(b)));
    expect(canonicalSection(a).conceptKeys).toEqual(['a.b', 'b.c']);
  });

  it('reports what each depth contains', () => {
    const doc = LessonDocument.parse({
      title: 'T',
      objectives: [
        { key: 'o1', text: 'Basics', minDepthRank: 1 },
        { key: 'o2', text: 'Deep', minDepthRank: 4 },
      ],
      sections: [hook('hook', 1), note('basics', 1), note('deep', 4)],
    });
    const shallow = depthReport(doc, 2);
    expect(shallow).toMatchObject({ depth: 2, sectionKeys: ['hook', 'basics'], objectives: 1 });
    expect(Object.fromEntries(shallow.checks.map((c) => [c.key, c.ok]))).toEqual({
      hook: true,
      interactive: false,
      check: false,
      summary: false,
      outputs: true,
    });
    expect(depthReport(doc, 4).sectionKeys).toEqual(['hook', 'basics', 'deep']);
  });
});
