/**
 * Shapes the AI writes, and their conversion into the real lesson schema.
 *
 * Structured outputs cannot express open-ended maps or tuples, so a few step bodies have an
 * AI-friendly form here (lists of pairs instead of maps). Everything the AI returns is
 * converted and then validated by the real schema (`Section`, `LessonDocument`); whatever
 * fails is sent back for one repair. Outputs of code are never trusted from the AI: they are
 * produced by running the code.
 */
import { z } from 'zod';
import { resolveSections } from './engine';
import {
  CalloutBody,
  CardDeckBody,
  CodeExplorerBody,
  ContentKey,
  DepthRank,
  DiagramBody,
  ExplanationBody,
  HookBody,
  InterviewPlaybookBody,
  Objective,
  PlaygroundBody,
  PythonPackage,
  Rich,
  SECTION_KINDS,
  type Section,
  type SectionKind,
  SummaryBody,
  WidgetBody,
} from './schema';

const Short = (max = 120) => z.string().trim().min(1).max(max);
const Code = z.string().min(1).max(8000);

// ───────────── AI-friendly step bodies ─────────────

const GenCodeExampleBody = z.object({
  language: z.literal('python'),
  code: Code,
  /** 1-based line ranges with a short note each. */
  annotations: z.array(z.object({ from: z.number().int(), to: z.number().int(), note: Rich })),
  runnable: z.boolean(),
  packages: z.array(PythonPackage),
});

const Pair = z.object({ control: ContentKey, value: Short(40) });

const GenCodeExplorerBody = z.object({
  prompt: Rich.optional(),
  setup: Code.optional(),
  controls: CodeExplorerBody.shape.controls,
  states: z.array(
    z.object({
      when: z.array(Pair),
      code: Code,
      /** What the writer expects it to print. Replaced by the real output after running it. */
      expectedPrint: z.string().max(4000),
      verdict: z.object({ tone: z.enum(['ok', 'bad', 'info']), text: Rich }),
    }),
  ),
  defaultState: z.array(Pair),
  packages: z.array(PythonPackage),
});

const GenOption = z.object({ id: ContentKey, text: Rich });

const GenCheckItem = z.discriminatedUnion('type', [
  z.object({
    key: ContentKey,
    type: z.literal('mcq'),
    prompt: Rich,
    options: z.array(GenOption),
    answer: z.object({ correct: z.array(ContentKey) }),
    explanation: Rich,
  }),
  z.object({
    key: ContentKey,
    type: z.literal('multi'),
    prompt: Rich,
    options: z.array(GenOption),
    answer: z.object({ correct: z.array(ContentKey) }),
    explanation: Rich,
  }),
  z.object({
    key: ContentKey,
    type: z.literal('fill_blank'),
    prompt: Rich.optional(),
    /** Text with blanks such as {{b1}}. */
    template: Short(400),
    blanks: z.array(z.object({ blank: ContentKey, accepted: z.array(Short(60)) })),
    explanation: Rich,
  }),
  z.object({
    key: ContentKey,
    type: z.literal('predict_output'),
    prompt: Rich.optional(),
    language: z.literal('python'),
    code: Code,
    options: z.array(GenOption),
    answer: z.object({ correct: z.array(ContentKey) }),
    explanation: Rich,
  }),
  z.object({
    key: ContentKey,
    type: z.literal('order_steps'),
    prompt: Rich,
    steps: z.array(GenOption),
    answer: z.object({ order: z.array(ContentKey) }),
    explanation: Rich,
  }),
  z.object({
    key: ContentKey,
    type: z.literal('reasoning'),
    prompt: Rich,
    modelAnswer: Rich,
    rubric: z.array(Short(200)),
  }),
]);

const genEnvelope = {
  key: ContentKey,
  title: Short(100).optional(),
  depthRank: DepthRank,
  slotKey: ContentKey.optional(),
  roleScope: z.array(z.string()).optional(),
  conceptKeys: z.array(z.string()),
};

export const GenSection = z.discriminatedUnion('kind', [
  z.object({ ...genEnvelope, kind: z.literal('HOOK'), body: HookBody }),
  z.object({ ...genEnvelope, kind: z.literal('EXPLANATION'), body: ExplanationBody }),
  z.object({ ...genEnvelope, kind: z.literal('CARD_DECK'), body: CardDeckBody }),
  z.object({ ...genEnvelope, kind: z.literal('DIAGRAM'), body: DiagramBody }),
  z.object({ ...genEnvelope, kind: z.literal('CODE_EXAMPLE'), body: GenCodeExampleBody }),
  z.object({ ...genEnvelope, kind: z.literal('CODE_EXPLORER'), body: GenCodeExplorerBody }),
  z.object({ ...genEnvelope, kind: z.literal('WIDGET'), body: WidgetBody }),
  z.object({
    ...genEnvelope,
    kind: z.literal('KNOWLEDGE_CHECK'),
    body: z.object({ items: z.array(GenCheckItem) }),
  }),
  z.object({ ...genEnvelope, kind: z.literal('PLAYGROUND'), body: PlaygroundBody }),
  z.object({ ...genEnvelope, kind: z.literal('CALLOUT'), body: CalloutBody }),
  z.object({ ...genEnvelope, kind: z.literal('INTERVIEW_PLAYBOOK'), body: InterviewPlaybookBody }),
  z.object({ ...genEnvelope, kind: z.literal('SUMMARY'), body: SummaryBody }),
]);
export type GenSection = z.infer<typeof GenSection>;

/** A batch of written steps. */
export const GenSectionBatch = z.object({ sections: z.array(GenSection) });
export type GenSectionBatch = z.infer<typeof GenSectionBatch>;

const toMap = (pairs: Array<{ control: string; value: string }>) =>
  Object.fromEntries(pairs.map((p) => [p.control, p.value]));

/**
 * An AI-written step in the real lesson shape. Code outputs are left for the verifier:
 * explorer states start with the writer's expected print, flagged until the code has run.
 */
export function fromGenSection(g: GenSection): unknown {
  const envelope = {
    key: g.key,
    ...(g.title ? { title: g.title } : {}),
    depthRank: g.depthRank,
    ...(g.slotKey ? { slotKey: g.slotKey } : {}),
    roleScope: g.roleScope ?? [],
    conceptKeys: g.conceptKeys,
  };
  switch (g.kind) {
    case 'CODE_EXAMPLE': {
      const { annotations, ...rest } = g.body;
      return {
        ...envelope,
        kind: g.kind,
        body: {
          ...rest,
          annotations: annotations.map((a) => ({ lines: [a.from, a.to], note: a.note })),
        },
      };
    }
    case 'CODE_EXPLORER':
      return {
        ...envelope,
        kind: g.kind,
        body: {
          ...(g.body.prompt ? { prompt: g.body.prompt } : {}),
          ...(g.body.setup ? { setup: g.body.setup } : {}),
          controls: g.body.controls,
          states: g.body.states.map((st) => ({
            when: toMap(st.when),
            code: st.code,
            output: { kind: 'text', value: st.expectedPrint },
            verdict: st.verdict,
          })),
          defaultState: toMap(g.body.defaultState),
          packages: g.body.packages,
        },
      };
    case 'KNOWLEDGE_CHECK':
      return {
        ...envelope,
        kind: g.kind,
        body: {
          items: g.body.items.map((item) => {
            if (item.type !== 'fill_blank') return item;
            const { blanks, ...rest } = item;
            return {
              ...rest,
              answer: Object.fromEntries(blanks.map((b) => [b.blank, b.accepted])),
            };
          }),
        },
      };
    default:
      return { ...envelope, kind: g.kind, body: g.body };
  }
}

/** A real step in the AI-friendly shape (to show the AI a step it should rewrite). */
export function toGenSection(s: Section): GenSection {
  const envelope = {
    key: s.key,
    ...(s.title ? { title: s.title } : {}),
    depthRank: s.depthRank,
    ...(s.slotKey ? { slotKey: s.slotKey } : {}),
    roleScope: s.roleScope,
    conceptKeys: s.conceptKeys,
  };
  const pairs = (m: Record<string, string>) =>
    Object.entries(m).map(([control, value]) => ({ control, value }));
  switch (s.kind) {
    case 'CODE_EXAMPLE': {
      const { annotations, expectedOutput: _real, ...rest } = s.body;
      return {
        ...envelope,
        kind: s.kind,
        body: {
          ...rest,
          language: 'python',
          annotations: annotations.map((a) => ({ from: a.lines[0], to: a.lines[1], note: a.note })),
        },
      };
    }
    case 'CODE_EXPLORER':
      return {
        ...envelope,
        kind: s.kind,
        body: {
          ...(s.body.prompt ? { prompt: s.body.prompt } : {}),
          ...(s.body.setup ? { setup: s.body.setup } : {}),
          controls: s.body.controls,
          states: s.body.states.map((st) => ({
            when: pairs(st.when),
            code: st.code,
            expectedPrint: st.output.kind === 'text' ? st.output.value : '',
            verdict: st.verdict,
          })),
          defaultState: pairs(s.body.defaultState),
          packages: s.body.packages,
        },
      };
    case 'KNOWLEDGE_CHECK':
      return {
        ...envelope,
        kind: s.kind,
        body: {
          items: s.body.items.map((item) =>
            item.type === 'fill_blank'
              ? {
                  key: item.key,
                  type: item.type,
                  ...(item.prompt ? { prompt: item.prompt } : {}),
                  template: item.template,
                  blanks: Object.entries(item.answer).map(([blank, accepted]) => ({
                    blank,
                    accepted,
                  })),
                  explanation: item.explanation,
                }
              : item,
          ),
        },
      };
    default:
      return { ...envelope, kind: s.kind, body: s.body } as GenSection;
  }
}

// ───────────── The lesson plan ─────────────

export const PlannedSection = z.object({
  key: ContentKey,
  kind: z.enum(SECTION_KINDS as [SectionKind, ...SectionKind[]]),
  title: Short(100),
  depthRank: DepthRank,
  slotKey: ContentKey.optional(),
  conceptKeys: z.array(z.string()),
  /** What this step does for the learner, in one sentence. */
  purpose: Short(300),
});
export type PlannedSection = z.infer<typeof PlannedSection>;

export const LessonPlan = z.object({
  title: Short(100),
  subtitle: Short(200).optional(),
  objectives: z.array(Objective),
  sections: z.array(PlannedSection),
});
export type LessonPlan = z.infer<typeof LessonPlan>;

export interface PlanIssue {
  path: string;
  message: string;
}

/**
 * Structural rules for a plan, checked before any step is written: every depth in use opens
 * with a hook, has a check and something to try, and ends with a summary.
 */
export function checkPlan(
  plan: LessonPlan,
  opts: { depths: number[]; conceptKeys: string[]; maxSections?: number },
): PlanIssue[] {
  const issues: PlanIssue[] = [];
  const keys = plan.sections.map((s) => s.key);
  keys.forEach((k, i) => {
    if (keys.indexOf(k) !== i)
      issues.push({ path: `sections.${i}.key`, message: `Key "${k}" is used twice` });
  });
  const known = new Set(opts.conceptKeys);
  plan.sections.forEach((s, i) => {
    for (const c of s.conceptKeys) {
      if (!known.has(c))
        issues.push({ path: `sections.${i}.conceptKeys`, message: `Unknown concept "${c}"` });
    }
  });
  const slots = new Map<string, number[]>();
  for (const s of plan.sections) {
    if (s.slotKey) slots.set(s.slotKey, [...(slots.get(s.slotKey) ?? []), s.depthRank]);
  }
  for (const [slot, ranks] of slots) {
    if (new Set(ranks).size !== ranks.length) {
      issues.push({
        path: 'sections',
        message: `Slot "${slot}" has two variants at the same depth`,
      });
    }
  }
  if (plan.objectives.length === 0)
    issues.push({ path: 'objectives', message: 'Add at least one objective' });
  if (opts.maxSections && plan.sections.length > opts.maxSections) {
    issues.push({ path: 'sections', message: `At most ${opts.maxSections} steps, please` });
  }
  const interactive = new Set<SectionKind>([
    'CODE_EXPLORER',
    'WIDGET',
    'PLAYGROUND',
    'CODE_EXAMPLE',
    'CARD_DECK',
  ]);
  for (const depth of opts.depths) {
    const seen = resolveSections(
      plan.sections.map((s) => ({ ...s, roleScope: [] as string[] })),
      { depth, roleSlug: null, skillLevel: 0 },
    );
    const at = `At depth ${depth}`;
    if (seen.length < 4)
      issues.push({ path: 'sections', message: `${at} the lesson has only ${seen.length} steps` });
    if (seen[0]?.kind !== 'HOOK')
      issues.push({ path: 'sections', message: `${at} the first step must be a HOOK` });
    if (seen.at(-1)?.kind !== 'SUMMARY')
      issues.push({ path: 'sections', message: `${at} the last step must be a SUMMARY` });
    if (!seen.some((s) => s.kind === 'KNOWLEDGE_CHECK'))
      issues.push({ path: 'sections', message: `${at} add a KNOWLEDGE_CHECK` });
    if (!seen.some((s) => interactive.has(s.kind)))
      issues.push({ path: 'sections', message: `${at} add something to explore or try` });
    if (!plan.objectives.some((o) => o.minDepthRank <= depth)) {
      issues.push({ path: 'objectives', message: `${at} no objective applies` });
    }
  }
  return issues;
}

// ───────────── The evaluation report ─────────────

export const EVAL_DIMENSIONS = [
  'correctness',
  'depth_fit',
  'objective_alignment',
  'style',
  'code_quality',
  'prerequisites',
  'redundancy',
  'hallucination_risk',
  'interview_relevance',
] as const;
export type EvalDimension = (typeof EVAL_DIMENSIONS)[number];

export const EvaluationReport = z.object({
  scores: z.array(
    z.object({
      dimension: z.enum(EVAL_DIMENSIONS),
      score: z.number().int().min(1).max(5),
      reason: Short(500),
    }),
  ),
  issues: z.array(
    z.object({
      /** A step key, or "lesson" for the lesson as a whole. */
      sectionKey: z.string().min(1).max(80),
      severity: z.enum(['blocking', 'major', 'minor']),
      dimension: z.enum(EVAL_DIMENSIONS),
      problem: Short(500),
      suggestion: Short(500),
    }),
  ),
  summary: Short(1200),
  verdict: z.enum(['ready_for_review', 'needs_changes', 'blocking_issues']),
});
export type EvaluationReport = z.infer<typeof EvaluationReport>;

// ───────────── JSON Schema for structured outputs ─────────────

/** Keywords the structured-output API does not accept; they are re-checked by Zod instead. */
const UNSUPPORTED = new Set([
  '$schema',
  'default',
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minItems',
  'maxItems',
  'pattern',
  'propertyNames',
  'format',
]);

/** Zod → JSON Schema the API accepts: every object closed, oneOf as anyOf, unsupported limits dropped. */
export function llmJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const raw = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!node || typeof node !== 'object') return node;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (UNSUPPORTED.has(k)) continue;
      out[k === 'oneOf' ? 'anyOf' : k] =
        k === 'properties' || k === '$defs' || k === 'definitions'
          ? Object.fromEntries(
              Object.entries(v as Record<string, unknown>).map(([pk, pv]) => [pk, walk(pv)]),
            )
          : walk(v);
    }
    if (out.type === 'object') out.additionalProperties = false;
    return out;
  };
  return walk(raw) as Record<string, unknown>;
}
