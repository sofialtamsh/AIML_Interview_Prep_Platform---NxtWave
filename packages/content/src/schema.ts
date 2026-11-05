/**
 * Lesson content schema (docs/07-content-schema.md). Lessons are typed, versioned JSON:
 * generated or written once, validated here, rendered by the same components everywhere.
 * No HTML or JavaScript is ever stored; interactivity comes from vetted widgets that
 * content can only configure.
 */
import { z } from 'zod';

// ───────────── Primitives ─────────────

/** Stable identifier inside a lesson, e.g. "explore.chunk-size". */
export const ContentKey = z
  .string()
  .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/, 'Use lowercase words joined by dots or dashes')
  .max(80);

const HTML_TAG = /<\/?[a-z][a-z0-9-]*(\s[^>]*)?>/i;

/**
 * A safe markdown subset: **bold**, _italic_, `code`, [links](https://…) and glossary
 * chips [[term:embedding]]. Raw HTML is rejected.
 */
export const Rich = z
  .string()
  .trim()
  .min(1)
  .max(4000)
  .refine((s) => !HTML_TAG.test(s), 'Use markdown, not HTML');
export type Rich = z.infer<typeof Rich>;

const Short = (max = 120) => z.string().trim().min(1).max(max);
const Code = z.string().min(1).max(8000);
export const CodeLanguage = z.enum(['python']);
/** Packages the in-browser Python runtime may load. */
export const PythonPackage = z.enum(['numpy', 'pandas']);
export const DepthRank = z.number().int().min(1).max(5);

// ───────────── Explanation blocks ─────────────

export const Block = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), text: Rich }),
  z.object({ type: z.literal('steps'), items: z.array(Rich).min(1).max(12) }),
  z.object({ type: z.literal('bullets'), items: z.array(Rich).min(1).max(12) }),
  z.object({ type: z.literal('term'), term: Short(60), definition: Rich }),
  z.object({
    type: z.literal('table'),
    columns: z.array(Short(60)).min(2).max(6),
    rows: z
      .array(z.array(Short(200)))
      .min(1)
      .max(12),
    caption: Short(200).optional(),
  }),
  z.object({
    type: z.literal('compare'),
    left: z.object({ title: Short(60), points: z.array(Rich).min(1).max(6) }),
    right: z.object({ title: Short(60), points: z.array(Rich).min(1).max(6) }),
  }),
  z.object({ type: z.literal('note'), text: Rich }),
  z.object({ type: z.literal('analogy_vs_reality'), analogy: Rich, reality: Rich }),
]);
export type Block = z.infer<typeof Block>;

// ───────────── Section bodies ─────────────

export const HookBody = z.object({
  scenario: Rich,
  provocation: Short(200).optional(),
  analogy: z
    .object({
      text: Rich,
      mapping: z
        .array(z.object({ everyday: Short(80), technical: Short(80) }))
        .min(1)
        .max(5),
      whereItBreaks: Rich,
    })
    .optional(),
  bridge: Rich,
});

export const ExplanationBody = z.object({ blocks: z.array(Block).min(1).max(16) });

/** One emoji (with an optional skin tone or joiners), shown big on story cards. */
export const Emoji = z
  .string()
  .regex(
    /^\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}]){0,7}$/u,
    'Use a single emoji',
  );

export const CardDeckBody = z.object({
  /** swipe: story-style cards, one idea per card, swiped like a reel. */
  layout: z.enum(['flip', 'stepper', 'compare', 'grid', 'swipe']),
  cards: z
    .array(
      z.object({
        title: Short(80),
        front: Rich,
        back: Rich.optional(),
        tag: Short(40).optional(),
        emoji: Emoji.optional(),
      }),
    )
    .min(2)
    .max(10),
});

export const DiagramBody = z
  .object({
    type: z.literal('flow'),
    nodes: z
      .array(z.object({ id: ContentKey, label: Short(40), detail: Short(160).optional() }))
      .min(2)
      .max(8),
    edges: z.array(z.object({ from: ContentKey, to: ContentKey, label: Short(40).optional() })),
    steps: z
      .array(z.object({ title: Short(80), narration: Rich, highlight: z.array(ContentKey).min(1) }))
      .max(8)
      .default([]),
    caption: Short(200).optional(),
    altText: Short(400),
  })
  .superRefine((d, ctx) => {
    const ids = new Set(d.nodes.map((n) => n.id));
    if (ids.size !== d.nodes.length)
      ctx.addIssue({ code: 'custom', message: 'Node ids must be unique' });
    for (const e of d.edges) {
      if (!ids.has(e.from) || !ids.has(e.to)) {
        ctx.addIssue({ code: 'custom', message: `Edge ${e.from}→${e.to} uses an unknown node` });
      }
    }
    for (const s of d.steps) {
      for (const h of s.highlight) {
        if (!ids.has(h))
          ctx.addIssue({ code: 'custom', message: `Step highlights unknown node ${h}` });
      }
    }
  });

const lineCount = (code: string) => code.split('\n').length;

export const CodeExampleBody = z
  .object({
    language: CodeLanguage,
    code: Code,
    annotations: z
      .array(
        z.object({
          lines: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
          note: Rich,
        }),
      )
      .max(10)
      .default([]),
    runnable: z.boolean(),
    packages: z.array(PythonPackage).default([]),
    /** The real output. Set by execution during generation, never trusted from an LLM. */
    expectedOutput: z.string().max(4000).optional(),
  })
  .superRefine((b, ctx) => {
    const n = lineCount(b.code);
    for (const a of b.annotations) {
      if (a.lines[0] > a.lines[1] || a.lines[1] > n) {
        ctx.addIssue({
          code: 'custom',
          message: `Annotation lines ${a.lines.join('–')} are outside the code`,
        });
      }
    }
  });

const ExplorerOutput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), value: z.string().max(4000) }),
  z.object({
    kind: z.literal('table'),
    columns: z.array(Short(60)).min(1).max(8),
    rows: z.array(z.array(z.string().max(200))).max(30),
    highlightRows: z.array(z.number().int().min(0)).default([]),
  }),
]);
const Tone = z.enum(['ok', 'bad', 'info']);

/** The prototype's signature interaction: flip controls and watch code, output and verdict change. */
export const CodeExplorerBody = z
  .object({
    prompt: Rich.optional(),
    /** Shared definitions and data, run before every state's code (shown collapsed). */
    setup: Code.optional(),
    controls: z
      .array(
        z.object({
          id: ContentKey,
          label: Short(60),
          options: z
            .array(z.object({ value: Short(40), label: Short(40) }))
            .min(2)
            .max(5),
        }),
      )
      .min(1)
      .max(3),
    states: z
      .array(
        z.object({
          when: z.record(z.string(), z.string()),
          code: Code,
          output: ExplorerOutput,
          verdict: z.object({ tone: Tone, text: Rich }),
        }),
      )
      .min(2)
      .max(30),
    defaultState: z.record(z.string(), z.string()),
    packages: z.array(PythonPackage).default([]),
  })
  .superRefine((b, ctx) => {
    // Every combination of control values must have exactly one state.
    const combos = b.controls.reduce<Array<Record<string, string>>>(
      (acc, c) => acc.flatMap((a) => c.options.map((o) => ({ ...a, [c.id]: o.value }))),
      [{}],
    );
    const sig = (w: Record<string, string>) =>
      b.controls.map((c) => `${c.id}=${w[c.id] ?? ''}`).join('&');
    const states = b.states.map((s) => sig(s.when));
    for (const combo of combos) {
      const n = states.filter((s) => s === sig(combo)).length;
      if (n !== 1) {
        ctx.addIssue({
          code: 'custom',
          message: `Need exactly one state for ${sig(combo)} (found ${n})`,
        });
      }
    }
    if (!combos.some((c) => sig(c) === sig(b.defaultState))) {
      ctx.addIssue({ code: 'custom', message: 'defaultState is not a valid combination' });
    }
  });

// ───────────── Widgets (vetted components; content only fills params) ─────────────

const Range = z
  .object({
    min: z.number().int().min(0),
    max: z.number().int().min(1),
    step: z.number().int().min(1),
    default: z.number().int().min(0),
  })
  .refine((r) => r.min < r.max && r.default >= r.min && r.default <= r.max, 'Bad range');

export const ChunkerParams = z
  .object({
    text: z.string().trim().min(40).max(3000),
    size: Range,
    overlap: Range,
    highlight: z.object({ phrase: Short(120), label: Short(80) }).optional(),
  })
  .superRefine((p, ctx) => {
    if (p.overlap.max >= p.size.min) {
      ctx.addIssue({ code: 'custom', message: 'Overlap must stay below the smallest chunk size' });
    }
    if (p.highlight && !p.text.includes(p.highlight.phrase)) {
      ctx.addIssue({ code: 'custom', message: 'The highlight phrase must appear in the text' });
    }
  });

export const WidgetBody = z.discriminatedUnion('widget', [
  z.object({ widget: z.literal('chunker'), prompt: Rich.optional(), params: ChunkerParams }),
]);
export type WidgetBody = z.infer<typeof WidgetBody>;

// ───────────── Knowledge checks (graded on the server) ─────────────

const Option = z.object({ id: ContentKey, text: Rich });
const ids = (opts: Array<{ id: string }>) => new Set(opts.map((o) => o.id));

export const CheckItem = z
  .discriminatedUnion('type', [
    z.object({
      key: ContentKey,
      type: z.literal('mcq'),
      prompt: Rich,
      options: z.array(Option).min(2).max(6),
      answer: z.object({ correct: z.array(ContentKey).length(1) }),
      explanation: Rich,
    }),
    z.object({
      key: ContentKey,
      type: z.literal('multi'),
      prompt: Rich,
      options: z.array(Option).min(2).max(6),
      answer: z.object({ correct: z.array(ContentKey).min(1) }),
      explanation: Rich,
    }),
    z.object({
      key: ContentKey,
      type: z.literal('fill_blank'),
      prompt: Rich.optional(),
      /** Text with blanks, e.g. "Overlap repeats the last {{b1}} words." */
      template: Short(400),
      answer: z.record(ContentKey, z.array(Short(60)).min(1)),
      explanation: Rich,
    }),
    z.object({
      key: ContentKey,
      type: z.literal('predict_output'),
      prompt: Rich.optional(),
      language: CodeLanguage,
      code: Code,
      options: z.array(Option).min(2).max(6),
      answer: z.object({ correct: z.array(ContentKey).length(1) }),
      explanation: Rich,
    }),
    z.object({
      key: ContentKey,
      type: z.literal('order_steps'),
      prompt: Rich,
      steps: z.array(Option).min(3).max(8),
      answer: z.object({ order: z.array(ContentKey) }),
      explanation: Rich,
    }),
    z.object({
      key: ContentKey,
      type: z.literal('reasoning'),
      prompt: Rich,
      modelAnswer: Rich,
      rubric: z.array(Short(200)).min(1).max(6),
    }),
  ])
  .superRefine((item, ctx) => {
    if (item.type === 'mcq' || item.type === 'multi' || item.type === 'predict_output') {
      const known = ids(item.options);
      if (known.size !== item.options.length)
        ctx.addIssue({ code: 'custom', message: 'Option ids must be unique' });
      if (item.answer.correct.some((c) => !known.has(c))) {
        ctx.addIssue({ code: 'custom', message: 'The answer must be one of the options' });
      }
    }
    if (item.type === 'order_steps') {
      const known = ids(item.steps);
      const order = item.answer.order;
      if (
        order.length !== item.steps.length ||
        new Set(order).size !== order.length ||
        order.some((o) => !known.has(o))
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'The answer order must use every step exactly once',
        });
      }
    }
    if (item.type === 'fill_blank') {
      const blanks = [...item.template.matchAll(/\{\{([a-z0-9-]+)\}\}/g)].map((m) => m[1]);
      const keys = Object.keys(item.answer);
      if (
        blanks.length === 0 ||
        blanks.some((b) => !keys.includes(b as string)) ||
        keys.length !== blanks.length
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'Every {{blank}} needs an answer, and only those',
        });
      }
    }
  });
export type CheckItem = z.infer<typeof CheckItem>;

export const KnowledgeCheckBody = z
  .object({ items: z.array(CheckItem).min(1).max(6) })
  .refine(
    (b) => new Set(b.items.map((i) => i.key)).size === b.items.length,
    'Item keys must be unique',
  );

export const PlaygroundBody = z.object({
  language: CodeLanguage,
  instructions: Rich,
  starterCode: Code,
  hints: z.array(Rich).max(5).default([]),
  solution: Code,
  checks: z
    .array(z.object({ type: z.literal('stdout_contains'), value: Short(200), label: Short(120) }))
    .min(1)
    .max(6),
  packages: z.array(PythonPackage).default([]),
});

export const CalloutBody = z.object({
  tone: z.enum(['interview_tip', 'misconception', 'pitfall', 'real_world', 'remember']),
  title: Short(80),
  body: Rich,
});

export const InterviewPlaybookBody = z.object({
  question: Rich,
  totalMinutes: z.number().int().min(1).max(60).optional(),
  steps: z
    .array(
      z.object({ title: Short(80), minutes: z.number().min(0).max(30).optional(), detail: Rich }),
    )
    .min(2)
    .max(8),
  followUps: z.array(Short(200)).max(6).default([]),
});

export const SummaryBody = z.object({
  takeaways: z.array(Rich).min(1).max(8),
  remember: z.array(Short(160)).max(6).default([]),
});

// ───────────── Section envelope ─────────────

const envelope = {
  key: ContentKey,
  title: Short(100).optional(),
  /** The minimum target depth that sees this section. */
  depthRank: DepthRank,
  /** Variant group: of the sections sharing a slot, the deepest one at or below the student's depth is shown. */
  slotKey: ContentKey.optional(),
  /** Role slugs (e.g. "ai-engineer"); empty means every role. Slugs keep content portable. */
  roleScope: z
    .array(
      z
        .string()
        .regex(/^[a-z0-9-]+$/)
        .max(60),
    )
    .max(10)
    .default([]),
  /** Concept keys from the curriculum, e.g. "rag.chunking.size-overlap". */
  conceptKeys: z.array(z.string().min(1).max(120)).max(12).default([]),
  /** Computed from the content when omitted. */
  estimatedMinutes: z.number().int().min(1).max(60).optional(),
};

export const Section = z.discriminatedUnion('kind', [
  z.object({ ...envelope, kind: z.literal('HOOK'), body: HookBody }),
  z.object({ ...envelope, kind: z.literal('EXPLANATION'), body: ExplanationBody }),
  z.object({ ...envelope, kind: z.literal('CARD_DECK'), body: CardDeckBody }),
  z.object({ ...envelope, kind: z.literal('DIAGRAM'), body: DiagramBody }),
  z.object({ ...envelope, kind: z.literal('CODE_EXAMPLE'), body: CodeExampleBody }),
  z.object({ ...envelope, kind: z.literal('CODE_EXPLORER'), body: CodeExplorerBody }),
  z.object({ ...envelope, kind: z.literal('WIDGET'), body: WidgetBody }),
  z.object({ ...envelope, kind: z.literal('KNOWLEDGE_CHECK'), body: KnowledgeCheckBody }),
  z.object({ ...envelope, kind: z.literal('PLAYGROUND'), body: PlaygroundBody }),
  z.object({ ...envelope, kind: z.literal('CALLOUT'), body: CalloutBody }),
  z.object({ ...envelope, kind: z.literal('INTERVIEW_PLAYBOOK'), body: InterviewPlaybookBody }),
  z.object({ ...envelope, kind: z.literal('SUMMARY'), body: SummaryBody }),
]);
export type Section = z.infer<typeof Section>;
export type SectionKind = Section['kind'];
export const SECTION_KINDS = Section.options.map((o) => o.shape.kind.value) as SectionKind[];

export const Objective = z.object({ key: ContentKey, text: Short(200), minDepthRank: DepthRank });
export type Objective = z.infer<typeof Objective>;

/** A whole lesson as authored, imported or generated. */
export const LessonDocument = z
  .object({
    title: Short(100),
    subtitle: Short(200).optional(),
    objectives: z.array(Objective).min(1).max(12),
    sections: z.array(Section).min(1).max(60),
  })
  .superRefine((d, ctx) => {
    const keys = d.sections.map((s) => s.key);
    const dup = keys.find((k, i) => keys.indexOf(k) !== i);
    if (dup)
      ctx.addIssue({
        code: 'custom',
        message: `Section key "${dup}" is used twice`,
        path: ['sections'],
      });
    const slots = new Map<string, number[]>();
    for (const s of d.sections) {
      if (s.slotKey) slots.set(s.slotKey, [...(slots.get(s.slotKey) ?? []), s.depthRank]);
    }
    for (const [slot, ranks] of slots) {
      if (new Set(ranks).size !== ranks.length) {
        ctx.addIssue({
          code: 'custom',
          message: `Slot "${slot}" has two variants at the same depth`,
          path: ['sections'],
        });
      }
    }
  });
export type LessonDocument = z.infer<typeof LessonDocument>;

/** The authored shape (defaults not yet applied), e.g. for exemplar files. */
export type LessonDocumentInput = z.input<typeof LessonDocument>;
