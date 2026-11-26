/**
 * What a student's browser receives. Answers, explanations, model answers and solutions are
 * removed here and only revealed by the server after an attempt (docs/07 §8).
 * The API also serialises responses through these schemas, so unknown fields are dropped.
 */
import { z } from 'zod';
import {
  CalloutBody,
  CardDeckBody,
  CodeExampleBody,
  CodeExplorerBody,
  ContentKey,
  DepthRank,
  DiagramBody,
  ExplanationBody,
  HookBody,
  InterviewPlaybookBody,
  PlaygroundBody,
  Rich,
  type Section,
  SlidesBody,
  SummaryBody,
  VisualBody,
  WidgetBody,
} from './schema';

const Option = z.object({ id: z.string(), text: z.string() });

export const StudentCheckItem = z.discriminatedUnion('type', [
  z.object({
    key: z.string(),
    type: z.literal('mcq'),
    prompt: z.string(),
    options: z.array(Option),
  }),
  z.object({
    key: z.string(),
    type: z.literal('multi'),
    prompt: z.string(),
    options: z.array(Option),
  }),
  z.object({
    key: z.string(),
    type: z.literal('fill_blank'),
    prompt: z.string().optional(),
    template: z.string(),
  }),
  z.object({
    key: z.string(),
    type: z.literal('predict_output'),
    prompt: z.string().optional(),
    language: z.string(),
    code: z.string(),
    options: z.array(Option),
  }),
  z.object({
    key: z.string(),
    type: z.literal('order_steps'),
    prompt: z.string(),
    steps: z.array(Option),
  }),
  z.object({ key: z.string(), type: z.literal('reasoning'), prompt: z.string() }),
]);
export type StudentCheckItem = z.infer<typeof StudentCheckItem>;

const StudentPlaygroundBody = PlaygroundBody.omit({ solution: true }).extend({
  hasSolution: z.boolean(),
});

const envelope = {
  key: z.string(),
  revisionId: z.string(),
  title: z.string().optional(),
  depthRank: DepthRank,
  conceptKeys: z.array(z.string()),
  estimatedMinutes: z.number().int(),
  /** A quick refresher: the student said they already know this. Never required. */
  fastTrack: z.boolean(),
};

export const StudentSection = z.discriminatedUnion('kind', [
  z.object({ ...envelope, kind: z.literal('HOOK'), body: HookBody }),
  z.object({ ...envelope, kind: z.literal('EXPLANATION'), body: ExplanationBody }),
  z.object({ ...envelope, kind: z.literal('CARD_DECK'), body: CardDeckBody }),
  z.object({ ...envelope, kind: z.literal('DIAGRAM'), body: DiagramBody }),
  z.object({ ...envelope, kind: z.literal('VISUAL'), body: VisualBody }),
  // Slides carry no secrets: their try-it moments are ungraded warm-ups.
  z.object({ ...envelope, kind: z.literal('SLIDES'), body: SlidesBody }),
  z.object({ ...envelope, kind: z.literal('CODE_EXAMPLE'), body: CodeExampleBody }),
  z.object({ ...envelope, kind: z.literal('CODE_EXPLORER'), body: CodeExplorerBody }),
  z.object({ ...envelope, kind: z.literal('WIDGET'), body: WidgetBody }),
  z.object({
    ...envelope,
    kind: z.literal('KNOWLEDGE_CHECK'),
    // With `draw`, `items` is the whole pool (questions only, never answers): the player draws
    // each attempt's questions from it and the server still grades every answer.
    body: z.object({ items: z.array(StudentCheckItem), draw: z.number().int().optional() }),
  }),
  z.object({ ...envelope, kind: z.literal('PLAYGROUND'), body: StudentPlaygroundBody }),
  z.object({ ...envelope, kind: z.literal('CALLOUT'), body: CalloutBody }),
  z.object({ ...envelope, kind: z.literal('INTERVIEW_PLAYBOOK'), body: InterviewPlaybookBody }),
  z.object({ ...envelope, kind: z.literal('SUMMARY'), body: SummaryBody }),
]);
export type StudentSection = z.infer<typeof StudentSection>;

function stripItem(
  item: Extract<Section, { kind: 'KNOWLEDGE_CHECK' }>['body']['items'][number],
): StudentCheckItem {
  switch (item.type) {
    case 'mcq':
    case 'multi':
      return {
        key: item.key,
        type: item.type,
        prompt: item.prompt,
        options: shuffleStable(item.options, item.key),
      };
    case 'fill_blank':
      return { key: item.key, type: item.type, prompt: item.prompt, template: item.template };
    case 'predict_output':
      return {
        key: item.key,
        type: item.type,
        prompt: item.prompt,
        language: item.language,
        code: item.code,
        options: shuffleStable(item.options, item.key),
      };
    case 'order_steps':
      return {
        key: item.key,
        type: item.type,
        prompt: item.prompt,
        steps: shuffleStable(item.steps, item.key),
      };
    case 'reasoning':
      return { key: item.key, type: item.type, prompt: item.prompt };
  }
}

/**
 * Authors tend to write the right answer first (and steps in the correct order), so options and
 * steps never reach the student in the authored order. A deterministic shuffle (seeded by the
 * item key) keeps the order stable between visits; grading uses ids, so it is unaffected.
 */
export function shuffleStable<T>(list: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  // Never hand out the answer order by accident.
  if (out.every((x, i) => x === list[i]) && out.length > 1) out.push(out.shift() as T);
  return out;
}

export function toStudentSection(
  s: Section,
  extra: { revisionId: string; estimatedMinutes: number; fastTrack: boolean },
): StudentSection {
  const base = {
    key: s.key,
    revisionId: extra.revisionId,
    title: s.title,
    depthRank: s.depthRank,
    conceptKeys: s.conceptKeys,
    estimatedMinutes: extra.estimatedMinutes,
    fastTrack: extra.fastTrack,
  };
  switch (s.kind) {
    case 'KNOWLEDGE_CHECK':
      return {
        ...base,
        kind: s.kind,
        body: {
          items: s.body.items.map(stripItem),
          ...(s.body.draw === undefined ? {} : { draw: s.body.draw }),
        },
      };
    case 'PLAYGROUND': {
      const { solution: _hidden, ...rest } = s.body;
      return { ...base, kind: s.kind, body: { ...rest, hasSolution: true } };
    }
    default:
      return { ...base, kind: s.kind, body: s.body } as StudentSection;
  }
}

/** Responses a student can submit to a knowledge-check item. */
export const CheckResponse = z.discriminatedUnion('type', [
  z.object({ type: z.literal('mcq'), choice: ContentKey }),
  z.object({ type: z.literal('multi'), choices: z.array(ContentKey).min(1).max(6) }),
  z.object({ type: z.literal('fill_blank'), blanks: z.record(z.string(), z.string().max(200)) }),
  z.object({ type: z.literal('predict_output'), choice: ContentKey }),
  z.object({ type: z.literal('order_steps'), order: z.array(ContentKey).min(1).max(8) }),
  z.object({
    type: z.literal('reasoning'),
    text: z.string().trim().min(1).max(4000),
    /**
     * Written answers are self-assessed in the MVP: the student submits their answer, sees the
     * model answer, then rates themselves (a second submission with the rating).
     */
    selfRating: z.enum(['got_it', 'partly', 'missed']).optional(),
  }),
]);
export type CheckResponse = z.infer<typeof CheckResponse>;

/** What the server reveals after an attempt. */
export const CheckResult = z.object({
  /** Null while a written answer waits for the student's self-rating. */
  correct: z.boolean().nullable(),
  explanation: Rich.optional(),
  reveal: z.union([
    z.object({ correct: z.array(z.string()) }),
    z.object({ answers: z.record(z.string(), z.string()) }),
    z.object({ order: z.array(z.string()) }),
    z.object({ modelAnswer: z.string(), rubric: z.array(z.string()) }),
  ]),
});
export type CheckResult = z.infer<typeof CheckResult>;
