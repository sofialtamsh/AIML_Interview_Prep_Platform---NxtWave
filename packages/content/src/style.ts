/**
 * Writing styles for lessons and the readability checks that hold content to them.
 * The style text is injected into AI prompts; the budgets are checked on every step,
 * whoever wrote it, so "minimum words, maximum impact" is measured, not hoped for.
 */
import type { Section } from './schema';

export const STYLE_KEYS = ['genz', 'standard', 'deep'] as const;
export type StyleKey = (typeof STYLE_KEYS)[number];

export interface StyleBudgets {
  /** Words in one sentence. */
  sentenceWords: number;
  /** Words in one paragraph, bullet, step or note. */
  blockWords: number;
  /** Words on the front of a card. */
  cardWords: number;
  /** Words in a whole step (code excluded). */
  stepWords: number;
}

export interface StyleDefinition {
  label: string;
  summary: string;
  budgets: StyleBudgets;
  /** Instructions for writers and for the generation agent. */
  guide: string[];
}

const SHARED_GUIDE = [
  'Write like a great mentor talking to one student: "you", contractions, warm and direct.',
  'Hook first: open with a relatable problem before any definition. Simple idea before the formal one.',
  'Use everyday Indian contexts where they fit naturally (UPI, food delivery, IRCTC, cricket, placements). Never force them.',
  'Plain English. Many learners use English as a second language, so no idioms and no slang that needs explaining.',
  'Define every technical term the first time it appears, in one short line.',
  'Label analogies as analogies and say where each one breaks.',
  'Accuracy is never traded for simplicity. If something is simplified, say so.',
];

export const STYLES: Record<StyleKey, StyleDefinition> = {
  genz: {
    label: 'Gen Z bites',
    summary: 'Punchy and visual. One idea per card, the fewest words that still teach it.',
    budgets: { sentenceWords: 16, blockWords: 45, cardWords: 28, stepWords: 170 },
    guide: [
      ...SHARED_GUIDE,
      'Minimum words, maximum impact. Cut every word that does not teach.',
      'One idea per card, paragraph or bullet. Short sentences (about 12 words).',
      'Prefer showing over telling: story cards (layout "swipe"), explorers, widgets and diagrams over paragraphs.',
      'Use "swipe" card decks for key ideas, with one emoji per card that matches the idea.',
      'Headings are punchy questions or claims ("Why not one giant chunk?"), not textbook labels.',
      'Fun, never cringe: at most one emoji per card or block, no memes, no hype words.',
    ],
  },
  standard: {
    label: 'Standard',
    summary: 'Conversational mentor tone with a little more explanation per step.',
    budgets: { sentenceWords: 22, blockWords: 70, cardWords: 45, stepWords: 260 },
    guide: [
      ...SHARED_GUIDE,
      'Keep paragraphs short (2–4 sentences). Use steps and comparisons to break up text.',
      'Use card decks and interactive steps wherever a behaviour can be seen.',
    ],
  },
  deep: {
    label: 'Deep dive',
    summary: 'Thorough reasoning, measurement and trade-offs, for advanced revision.',
    budgets: { sentenceWords: 26, blockWords: 110, cardWords: 70, stepWords: 420 },
    guide: [
      ...SHARED_GUIDE,
      'Go deeper with mechanism, measurement and trade-offs, never with harder words.',
      'Still break long reasoning into steps, tables and comparisons.',
    ],
  },
};

// ───────────── Readability ─────────────

/** Fields that hold code, identifiers or settings rather than prose. */
const NON_PROSE = new Set([
  'key',
  'id',
  'kind',
  'type',
  'layout',
  'language',
  'packages',
  'code',
  'setup',
  'starterCode',
  'solution',
  'expectedOutput',
  'output',
  'when',
  'defaultState',
  'value',
  'widget',
  'tone',
  'lines',
  'highlight',
  'from',
  'to',
  'emoji',
  'answer',
  'conceptKeys',
  'roleScope',
  'slotKey',
  'params',
]);

/** Every block of prose in a step (paragraphs, bullets, card faces…), code excluded. */
export function proseBlocks(body: unknown): string[] {
  if (typeof body === 'string') return [body];
  if (Array.isArray(body)) return body.flatMap(proseBlocks);
  if (body && typeof body === 'object') {
    return Object.entries(body as Record<string, unknown>).flatMap(([k, v]) =>
      NON_PROSE.has(k) ? [] : proseBlocks(v),
    );
  }
  return [];
}

/** Markdown and glossary syntax removed, so it doesn't count as words. */
const plain = (s: string) =>
  s
    .replace(/`[^`]*`/g, 'x')
    .replace(/\[\[(?:term:)?([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_]/g, '');

export const wordCount = (s: string) =>
  (plain(s).match(/[\p{L}\p{N}][\p{L}\p{N}'’.\-/%]*/gu) ?? []).length;

export function sentencesOf(s: string): string[] {
  return plain(s)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((x) => x.trim())
    .filter((x) => wordCount(x) > 0);
}

const EMOJI = /\p{Extended_Pictographic}/gu;

export interface StepReadability {
  sectionKey: string;
  words: number;
  sentences: number;
  avgSentenceWords: number;
  longestSentenceWords: number;
  emoji: number;
}

export function readabilityOf(section: Pick<Section, 'key' | 'body'>): StepReadability {
  const blocks = proseBlocks(section.body);
  const sentences = blocks.flatMap(sentencesOf);
  const lengths = sentences.map(wordCount);
  const words = blocks.reduce((a, b) => a + wordCount(b), 0);
  return {
    sectionKey: section.key,
    words,
    sentences: sentences.length,
    avgSentenceWords: sentences.length ? Math.round((words / sentences.length) * 10) / 10 : 0,
    longestSentenceWords: Math.max(0, ...lengths),
    emoji: blocks.reduce((a, b) => a + (b.match(EMOJI)?.length ?? 0), 0),
  };
}

export interface StyleIssue {
  sectionKey: string;
  rule: 'step_words' | 'sentence_words' | 'block_words' | 'card_words';
  message: string;
}

const clip = (s: string, n = 60) => {
  const t = plain(s).trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/** Where a step goes over the style's word budgets. Advice for writers and reviewers, never blocking. */
export function styleIssues(section: Section, style: StyleKey): StyleIssue[] {
  const b = STYLES[style].budgets;
  const issues: StyleIssue[] = [];
  const r = readabilityOf(section);
  // Interactive and code steps carry their words in code and controls; checks and playbooks run long by nature.
  const stepBudget =
    section.kind === 'INTERVIEW_PLAYBOOK' || section.kind === 'KNOWLEDGE_CHECK'
      ? b.stepWords * 1.6
      : b.stepWords;
  if (r.words > stepBudget) {
    issues.push({
      sectionKey: section.key,
      rule: 'step_words',
      message: `${r.words} words; aim for ${Math.round(stepBudget)} or fewer in this style`,
    });
  }
  const long = proseBlocks(section.body)
    .flatMap(sentencesOf)
    .filter((x) => wordCount(x) > b.sentenceWords);
  if (long.length) {
    issues.push({
      sectionKey: section.key,
      rule: 'sentence_words',
      message: `${long.length} long ${long.length === 1 ? 'sentence' : 'sentences'} (over ${b.sentenceWords} words), e.g. "${clip(long[0] as string)}"`,
    });
  }
  const cardFronts =
    section.kind === 'CARD_DECK' ? section.body.cards.map((c) => c.front) : ([] as string[]);
  const longCards = cardFronts.filter((f) => wordCount(f) > b.cardWords);
  if (longCards.length) {
    issues.push({
      sectionKey: section.key,
      rule: 'card_words',
      message: `${longCards.length} ${longCards.length === 1 ? 'card is' : 'cards are'} over ${b.cardWords} words on the front`,
    });
  }
  const blocks = proseBlocks(section.body).filter(
    (x) => !cardFronts.includes(x) && wordCount(x) > b.blockWords,
  );
  if (blocks.length) {
    issues.push({
      sectionKey: section.key,
      rule: 'block_words',
      message: `${blocks.length} ${blocks.length === 1 ? 'paragraph is' : 'paragraphs are'} over ${b.blockWords} words, e.g. "${clip(blocks[0] as string)}"`,
    });
  }
  return issues;
}
