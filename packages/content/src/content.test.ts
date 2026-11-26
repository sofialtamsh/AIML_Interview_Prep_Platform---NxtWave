import { describe, expect, it } from 'vitest';
import {
  type CheckItem,
  canonicalJson,
  canonicalSection,
  depthReport,
  estimateSectionMinutes,
  gradeItem,
  internalDataIssues,
  isFastTrack,
  LessonDocument,
  resolveSections,
  Section,
  styleIssues,
  titleIssues,
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

describe('step titles', () => {
  const titled = (title: string) => note('t', 1, { title });

  it('accepts short technical titles', () => {
    expect(titleIssues(titled('Sentence-aware chunking'))).toEqual([]);
    expect(titleIssues(titled('Evaluate chunking with recall@k'))).toEqual([]);
    expect(titleIssues(note('untitled', 1))).toEqual([]);
  });

  it('flags long, question-style and emoji titles, in every style', () => {
    const rules = (t: string) => titleIssues(titled(t)).map((i) => i.message);
    expect(rules('Find the setting that keeps the whole answer in one chunk')[0]).toMatch(
      /11 words/,
    );
    expect(rules('Why split documents at all?')).toEqual([
      'Title is a question; name the concept or the action instead',
    ]);
    // A quoted question inside the title is still a question title.
    expect(rules('Answering "Why join us?"')).toHaveLength(1);
    expect(rules('Chunk metadata 🏷️')).toEqual(['No emoji in step titles']);
    expect(styleIssues(titled('Why chunk?'), 'deep').map((i) => i.rule)).toEqual(['title']);
  });

  it('reads a callout title from its body', () => {
    const callout = Section.parse({
      key: 'c',
      kind: 'CALLOUT',
      depthRank: 1,
      body: { tone: 'pitfall', title: 'Are characters and tokens the same?', body: 'No.' },
    });
    expect(titleIssues(callout)).toHaveLength(1);
  });
});

describe('card deck word budget', () => {
  // A 50-word answer: five sentences of ten words.
  const answer = Array.from(
    { length: 5 },
    () => 'This short sentence explains one more part of it.',
  ).join(' ');
  const deck = (layout: 'flip' | 'grid', cards: number) =>
    Section.parse({
      key: 'interview-questions',
      kind: 'CARD_DECK',
      depthRank: 1,
      body: {
        layout,
        cards: Array.from({ length: cards }, (_, i) => ({
          title: `Question ${i + 1}`,
          front: 'What would you say to this interview question?',
          back: answer,
        })),
      },
    });
  const rules = (s: Section) => styleIssues(s, 'standard').map((i) => i.rule);

  it('lets flip cards grow with the number of cards, as slides do', () => {
    // Eight cards of about 60 words: over the single-step budget, under 8 × 65.
    expect(rules(deck('flip', 8))).toEqual([]);
  });

  it('keeps the single-step budget for cards shown all at once', () => {
    expect(rules(deck('grid', 8))).toContain('step_words');
  });
});

describe('internal interview data', () => {
  const para = (text: string) => note('p', 1, { body: { blocks: [{ type: 'paragraph', text }] } });
  const flagged = (text: string) => internalDataIssues(para(text)).length > 0;

  it('flags quoted evidence, company counts and shares of companies', () => {
    for (const text of [
      'In NxtWave\'s interview data, **"Tell me about yourself"** came up at 39 of 72 ML and AI companies.',
      'Asked at 49 of 72 ML/AI companies (68%), usually first.',
      'Self-introduction at 78% of companies hiring at 8 LPA or more.',
      'Metric questions at 28% of 8+ LPA companies.',
      'A classic follow-up, asked by name at 6 companies.',
      'Our data shows this comes up often.',
      'The hiring data says to prepare it.',
    ]) {
      expect(flagged(text), text).toBe(true);
    }
  });

  it('reads every string, not just prose (card tags count)', () => {
    const deck = Section.parse({
      key: 'follow-ups',
      kind: 'CARD_DECK',
      depthRank: 1,
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'Walk me through your resume',
            front: 'Know every line.',
            tag: '30 of 72 companies',
          },
          { title: 'Any questions for us?', front: 'Ask one or two.', tag: 'End of the round' },
        ],
      },
    });
    expect(internalDataIssues(deck).map((i) => i.rule)).toEqual(['internal_data']);
    expect(styleIssues(deck, 'standard').map((i) => i.rule)).toContain('internal_data');
  });

  it('leaves ordinary teaching alone', () => {
    for (const text of [
      'End with why this company: one specific link to their product.',
      'This fits every company, so it shows no research.',
      'On 300 screened resumes, 82% of its top picks were on the shortlist.',
      'Usually asked early in the first technical round.',
      'Two of eight interns got PPOs.',
    ]) {
      expect(flagged(text), text).toBe(false);
    }
  });
});

describe('answer order', () => {
  it('never shows choice options in the authored order, and keeps the order stable', () => {
    const check = Section.parse({
      key: 'c',
      kind: 'KNOWLEDGE_CHECK',
      depthRank: 1,
      body: {
        items: [
          {
            key: 'q1',
            type: 'mcq',
            prompt: 'Pick one',
            options: ['a', 'b', 'c', 'd'].map((id) => ({ id, text: id.toUpperCase() })),
            answer: { correct: ['a'] },
            explanation: 'Because.',
          },
        ],
      },
    });
    const ids = () => {
      const s = toStudentSection(check, { revisionId: 'r', estimatedMinutes: 1, fastTrack: false });
      const item = s.kind === 'KNOWLEDGE_CHECK' ? s.body.items[0] : undefined;
      return item?.type === 'mcq' ? item.options.map((o) => o.id) : [];
    };
    expect(ids()).not.toEqual(['a', 'b', 'c', 'd']);
    expect(ids()).toEqual(ids());
    expect([...ids()].sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('moving pictures and real-world cards', () => {
  const deck = (slide: Record<string, unknown>) =>
    Section.safeParse({
      key: 'd',
      kind: 'SLIDES',
      depthRank: 1,
      body: { slides: [slide, { title: 'Next', body: 'More.' }] },
    });
  const hook = (body: Record<string, unknown>) =>
    Section.safeParse({
      key: 'h',
      kind: 'HOOK',
      depthRank: 1,
      body: { scenario: 'Open any food-delivery app.', bridge: 'So.', ...body },
    });

  it('takes library animations on slides and hooks, and nothing else', () => {
    // An animation alone is enough for a slide, and it can sit with a code visual.
    expect(deck({ title: 'Two names', animation: { name: 'name-tags' } }).success).toBe(true);
    expect(
      deck({
        title: 'Sets',
        animation: { name: 'set-dedupe', caption: 'Real use: unique visitors' },
        visual: { type: 'code', code: 'print(set([1, 1]))', output: '{1}' },
      }).success,
    ).toBe(true);
    expect(deck({ title: 'Cat', animation: { name: 'dancing-cat' } }).success).toBe(false);
    expect(hook({ animation: { name: 'list-vs-tuple' } }).success).toBe(true);
  });

  it('draws real-world cards with the line-icon set, not emoji', () => {
    const items = [
      { icon: 'cart', label: 'Cart: a list', sub: 'Add and remove dishes' },
      { icon: 'pin', label: 'Location: a tuple' },
    ];
    expect(hook({ realWorld: { items } }).success).toBe(true);
    expect(hook({ realWorld: { items: [{ icon: '🛒', label: 'Cart' }, ...items] } }).success).toBe(
      false,
    );
    expect(hook({ realWorld: { items: items.slice(0, 1) } }).success).toBe(false);
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

describe('animated visuals', () => {
  const visual = (scene: Record<string, unknown>) =>
    Section.safeParse({
      key: 'v',
      kind: 'VISUAL',
      depthRank: 1,
      body: { scene, altText: 'A mock interview, message by message.' },
    });

  it('accepts a mock interview with takes, notes and verdicts', () => {
    const res = visual({
      type: 'chat',
      takes: [
        {
          label: 'Weak answer',
          tone: 'bad',
          messages: [
            { from: 'interviewer', text: 'Tell me about yourself.' },
            {
              from: 'candidate',
              text: 'My name is Riya and my father is a teacher.',
              note: { tone: 'bad', text: 'Starts with family, not skills' },
            },
          ],
          verdict: { tone: 'bad', text: 'Nothing here is about the job.' },
        },
        {
          label: 'Strong answer',
          messages: [{ from: 'candidate', text: 'I build ML models end to end.' }],
        },
      ],
    });
    expect(res.success).toBe(true);
    if (res.success && res.data.kind === 'VISUAL' && res.data.body.scene.type === 'chat') {
      expect(res.data.body.scene.interviewer).toBe('Interviewer'); // defaults filled in
      expect(res.data.body.scene.takes[1]?.tone).toBe('info');
    }
    const twins = visual({
      type: 'chat',
      takes: [
        { label: 'Same', messages: [{ from: 'candidate', text: 'A' }] },
        { label: 'Same', messages: [{ from: 'candidate', text: 'B' }] },
      ],
    });
    expect(twins.success).toBe(false);
  });

  it('times an anatomy only when every part has a duration', () => {
    const parts = [
      { label: 'Who you are', text: 'I am Riya, a final-year CSE student.', seconds: 10 },
      { label: 'Best project', text: 'I built a resume screener with BERT.', seconds: 25 },
    ];
    expect(visual({ type: 'anatomy', parts }).success).toBe(true);
    const mixed = parts.map((p, i) => (i === 0 ? p : { label: p.label, text: p.text }));
    expect(visual({ type: 'anatomy', parts: mixed }).success).toBe(false);
  });

  it('keeps array frames inside the row', () => {
    const ok = visual({
      type: 'array',
      cells: ['2', '6', '12', '20', '?'],
      frames: [
        {
          title: 'The gaps',
          narration: 'The gaps grow by 2 each time.',
          gaps: [
            { after: 0, label: '+4' },
            { after: 1, label: '+6' },
          ],
          pointers: [{ index: 4, label: 'next' }],
          window: { from: 0, to: 3, label: 'known' },
        },
        { title: 'Answer', narration: 'So the next is 30.', values: ['2', '6', '12', '20', '30'] },
      ],
    });
    expect(ok.success).toBe(true);
    const outside = (frame: Record<string, unknown>) =>
      visual({
        type: 'array',
        cells: ['1', '2', '3'],
        frames: [{ title: 'F', narration: 'N', ...frame }],
      }).success;
    expect(outside({ highlight: [3] })).toBe(false);
    expect(outside({ gaps: [{ after: 2, label: '+1' }] })).toBe(false);
    expect(outside({ pointers: [{ index: 5, label: 'i' }] })).toBe(false);
    expect(outside({ values: ['1', '2'] })).toBe(false);
    expect(outside({ window: { from: 2, to: 1 } })).toBe(false);
  });

  it('counts as something to explore and adds time per frame', () => {
    const anatomy = Section.parse({
      key: 'anatomy',
      kind: 'VISUAL',
      depthRank: 1,
      body: {
        altText: 'An introduction in five parts.',
        scene: {
          type: 'anatomy',
          parts: Array.from({ length: 5 }, (_, i) => ({ label: `Part ${i}`, text: 'Words.' })),
        },
      },
    });
    expect(estimateSectionMinutes(anatomy)).toBe(1); // 5 × 8 s plus reading
    const doc = LessonDocument.parse({
      title: 'T',
      objectives: [{ key: 'o1', text: 'Basics', minDepthRank: 1 }],
      sections: [hook('hook', 1), anatomy],
    });
    const checks = Object.fromEntries(depthReport(doc, 1).checks.map((c) => [c.key, c.ok]));
    expect(checks.interactive).toBe(true);
    // Students get the scene unchanged (it holds no answers).
    expect(
      toStudentSection(anatomy, { revisionId: 'r', estimatedMinutes: 1, fastTrack: false }).body,
    ).toEqual(anatomy.body);
  });
});

describe('slide decks', () => {
  const deck = (slides: Array<Record<string, unknown>>) =>
    Section.safeParse({ key: 's', kind: 'SLIDES', depthRank: 1, body: { slides } });
  const plain = { title: 'One idea', body: 'Short text.' };

  it('accepts slides with visuals and try-its', () => {
    const res = deck([
      { kicker: 'Rule 1', title: 'Lead with your work', points: ['Skills', 'Projects'] },
      {
        title: 'Big picture',
        visual: { type: 'icons', items: [{ icon: 'mic', label: 'Intro' }] },
      },
      { title: 'Numbers', visual: { type: 'stat', value: '39/72', label: 'companies asked' } },
      {
        title: 'Try it',
        try: {
          type: 'choice',
          prompt: 'Which opening is better?',
          options: [
            { text: 'Myself Arjun', correct: false, feedback: 'Sounds unnatural.' },
            { text: "I'm Arjun", correct: true, feedback: 'Natural and clear.' },
          ],
        },
      },
      {
        title: 'Run it',
        try: { type: 'code', prompt: 'Run this.', starter: 'print(2 + 2)', expected: '4' },
      },
    ]);
    expect(res.success).toBe(true);
    if (res.success && res.data.kind === 'SLIDES') {
      const compare = deck([
        plain,
        {
          title: 'Compare',
          visual: {
            type: 'compare',
            left: { title: 'A', items: ['x'] },
            right: { title: 'B', items: ['y'] },
          },
        },
      ]);
      expect(compare.success).toBe(true);
      if (compare.success && compare.data.kind === 'SLIDES') {
        const v = compare.data.body.slides[1]?.visual;
        expect(v?.type === 'compare' && v.better).toBe('right'); // default
      }
    }
  });

  it('accepts a sequence with one step label per pair of neighbours, or none', () => {
    const seq = (visual: Record<string, unknown>) => deck([plain, { title: 'Series', visual }]);
    const ok = seq({ type: 'sequence', terms: ['4', '9', '14'], ops: ['+5', '+5'], answer: true });
    expect(ok.success).toBe(true);
    expect(seq({ type: 'sequence', terms: ['1', '2'] }).success).toBe(true);
    expect(seq({ type: 'sequence', terms: ['4', '9', '14'], ops: ['+5'] }).success).toBe(false);
    expect(seq({ type: 'sequence', terms: ['4'] }).success).toBe(false);
    expect(seq({ type: 'sequence', terms: ['123456789'] }).success).toBe(false);
  });

  it('rejects empty slides, unknown icons, long code and decks of try-its', () => {
    expect(deck([plain, { title: 'Nothing here' }]).success).toBe(false);
    expect(
      deck([
        plain,
        { title: 'X', visual: { type: 'icons', items: [{ icon: 'unicorn', label: 'a' }] } },
      ]).success,
    ).toBe(false);
    const long = Array.from({ length: 15 }, (_, i) => `print(${i})`).join('\n');
    expect(deck([plain, { title: 'X', visual: { type: 'code', code: long } }]).success).toBe(false);
    const choice = {
      type: 'choice',
      prompt: 'Pick',
      options: [
        { text: 'a', correct: false, feedback: 'f' },
        { text: 'b', correct: false, feedback: 'f' },
      ],
    };
    expect(deck([plain, { title: 'X', try: choice }]).success).toBe(false); // nothing correct
    const write = { type: 'write', prompt: 'Write', sample: 'A sample answer.' };
    const tries = Array.from({ length: 5 }, (_, i) => ({ title: `T${i}`, try: write }));
    expect(deck(tries).success).toBe(false);
  });

  it('flags a slide headline that is a question', () => {
    const s = Section.parse({
      key: 's',
      kind: 'SLIDES',
      depthRank: 1,
      body: { slides: [plain, { title: 'What are your strengths?', body: 'Text.' }] },
    });
    expect(titleIssues(s).map((i) => i.message)).toEqual([
      'Slide 2 title is a question; name the idea and quote the question in the body',
    ]);
  });

  it('adds time per slide and counts as interactive only with a try-it', () => {
    const slides = Array.from({ length: 6 }, (_, i) => ({ title: `Slide ${i}`, body: 'Text.' }));
    const s = Section.parse({ key: 's', kind: 'SLIDES', depthRank: 1, body: { slides } });
    expect(estimateSectionMinutes(s)).toBe(1);
    const doc = (deckSlides: unknown[]) =>
      LessonDocument.parse({
        title: 'T',
        objectives: [{ key: 'o', text: 'O', minDepthRank: 1 }],
        sections: [
          hook('hook', 1),
          { key: 'd', kind: 'SLIDES', depthRank: 1, body: { slides: deckSlides } },
        ],
      });
    const interactive = (d: ReturnType<typeof doc>) =>
      depthReport(d, 1).checks.find((c) => c.key === 'interactive')?.ok;
    expect(interactive(doc(slides))).toBe(false);
    const withTry = [
      ...slides,
      { title: 'Try', try: { type: 'write', prompt: 'Write one line.', sample: 'A good line.' } },
    ];
    expect(interactive(doc(withTry))).toBe(true);
  });
});

describe('quiz pools', () => {
  const mcq = (key: string) => ({
    key,
    type: 'mcq',
    prompt: `Question ${key}`,
    options: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ],
    answer: { correct: ['a'] },
    explanation: 'A is right.',
  });
  const check = (count: number, draw?: number) => ({
    key: 'check.pool',
    kind: 'KNOWLEDGE_CHECK',
    depthRank: 1,
    body: {
      items: Array.from({ length: count }, (_, i) => mcq(`q${i + 1}`)),
      ...(draw === undefined ? {} : { draw }),
    },
  });

  it('lets a check hold more than six questions only when it draws from them', () => {
    expect(Section.safeParse(check(6)).success).toBe(true);
    expect(Section.safeParse(check(7)).success).toBe(false);
    expect(Section.safeParse(check(20, 5)).success).toBe(true);
    // A pool that draws all of its questions is not a pool.
    expect(Section.safeParse(check(5, 5)).success).toBe(false);
    expect(Section.safeParse(check(25, 5)).success).toBe(false);
  });

  it('sends the student the whole pool and the draw size, still without answers', () => {
    const student = toStudentSection(Section.parse(check(12, 5)), {
      revisionId: 'r1',
      estimatedMinutes: 4,
      fastTrack: false,
    });
    if (student.kind !== 'KNOWLEDGE_CHECK') throw new Error('not a check');
    expect(student.body.draw).toBe(5);
    expect(student.body.items).toHaveLength(12);
    expect(JSON.stringify(student)).not.toContain('A is right.');
    expect(JSON.stringify(student)).not.toContain('"answer"');
  });

  it('times one attempt, not the whole pool', () => {
    const drawn = estimateSectionMinutes(Section.parse(check(20, 5)));
    const five = estimateSectionMinutes(Section.parse(check(5)));
    expect(drawn).toBeGreaterThanOrEqual(five);
    expect(drawn).toBeLessThanOrEqual(five + 3);
  });

  it('counts a lesson that closes on its interview questions as properly ended', () => {
    const doc = LessonDocument.parse({
      title: 'Linear regression',
      objectives: [{ key: 'o', text: 'Explain the line', minDepthRank: 1 }],
      sections: [
        hook('hook', 1),
        check(8, 5),
        {
          key: 'interview-questions',
          kind: 'CARD_DECK',
          depthRank: 1,
          body: {
            layout: 'flip',
            cards: [
              { title: 'What it is', front: 'What is it?', back: 'A line.' },
              { title: 'The loss', front: 'Which loss?', back: 'MSE.' },
            ],
          },
        },
      ],
    });
    const report = depthReport(doc, 1);
    expect(report.checks.find((c) => c.key === 'summary')?.ok).toBe(true);
  });
});
