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

/**
 * Step titles (content-team decision, 2026-11-05): professional, technical and easy to scan,
 * never gimmicky. The player already shows the step type ("Quick check", "Your turn"…).
 */
export const TITLE_RULE =
  'Step titles: 2–6 words, technical and easy to scan, the way an engineer titles a section. Lead with the concept or the action the step covers ("Tune chunk size and overlap", "Sentence-aware chunking", "Evaluate chunking with recall@k"). Use the same term for the same idea everywhere. No questions, puns, slang or emoji, and no filler like "Free play", "Your turn" or "Quick check": the player already shows the step type.';
export const TITLE_MAX_WORDS = 7;

const SHARED_GUIDE = [
  TITLE_RULE,
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
      'The hook lives in the content (the scenario, the card, the explorer), not in the step title: titles stay short and technical.',
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
  // Spoken in play mode only: it adds no reading time and is not on the slide.
  'narration',
  'key',
  'id',
  'name',
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
  'highlight',
  'from',
  'to',
  'emoji',
  'answer',
  'conceptKeys',
  'roleScope',
  'slotKey',
  'params',
  // Slide decks: code, icons and settings, not prose.
  'starter',
  'expected',
  'icon',
  'better',
  'accent',
  'filename',
  'correct',
  'terms',
  'ops',
  // A slide table's cells are figures read at a glance; its column headings still count.
  'cells',
  'totals',
  // Screen-reader descriptions of visuals: they restate what the picture shows, so they don't
  // count against the reading budget a sighted student sees.
  'altText',
]);

/** Every block of prose in a step (paragraphs, bullets, card faces…), code excluded. A text with
 *  blank lines is several paragraphs, exactly as the player renders it. */
export function proseBlocks(body: unknown): string[] {
  if (typeof body === 'string') return body.split(/\n\s*\n/).filter((p) => p.trim());
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
  rule: 'step_words' | 'sentence_words' | 'block_words' | 'card_words' | 'title' | 'internal_data';
  message: string;
}

/** The title a student sees for a step (callouts carry theirs in the body). */
function titleOf(section: Section): string | undefined {
  if (section.title) return section.title;
  if (section.kind === 'CALLOUT') return section.body.title;
  return undefined;
}

/** Where a step title breaks the title rule: too long, a question, or emoji. */
export function titleIssues(section: Section): StyleIssue[] {
  const title = titleOf(section) ?? '';
  const issues: StyleIssue[] = [];
  const words = title ? wordCount(title) : 0;
  if (words > TITLE_MAX_WORDS) {
    issues.push({
      sectionKey: section.key,
      rule: 'title',
      message: `Title has ${words} words; keep step titles to 2–6 words`,
    });
  }
  if (title.includes('?')) {
    issues.push({
      sectionKey: section.key,
      rule: 'title',
      message: 'Title is a question; name the concept or the action instead',
    });
  }
  if (/\p{Extended_Pictographic}/u.test(title)) {
    issues.push({ sectionKey: section.key, rule: 'title', message: 'No emoji in step titles' });
  }
  // Slide headlines follow the same rule: name the idea, don't ask it. (Quote the question in
  // the body instead.)
  if (section.kind === 'SLIDES') {
    section.body.slides.forEach((s, i) => {
      if (s.title.includes('?')) {
        issues.push({
          sectionKey: section.key,
          rule: 'title',
          message: `Slide ${i + 1} title is a question; name the idea and quote the question in the body`,
        });
      }
    });
  }
  return issues;
}

const clip = (s: string, n = 60) => {
  const t = plain(s).trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/**
 * Interview evidence decides what a lesson teaches; students never see it quoted. These catch the
 * usual ways it leaks into lesson text: naming the data or NxtWave, company counts ("30 of 72
 * companies", "asked at 6 companies") and shares of companies ("78% of 8+ LPA companies").
 */
const INTERNAL_DATA: readonly RegExp[] = [
  /\b(?:interview|hiring|placement|recruit(?:er|ment)s?)['’]? (?:data|evidence|intelligence|records)\b/i,
  /\bour (?:interview |hiring )?data\b/i,
  /\bNxt ?Wave\b/i,
  /\b\d+\s+(?:of|out of)\s+(?:the\s+)?\d+\b[^.\n]{0,30}\bcompan/i,
  /\b\d+(?:\.\d+)?\s*%\s+of\s+[^.\n]{0,30}\bcompan/i,
  /\b(?:asked|came up|seen|appeared|showed up)\b[^.\n]{0,25}\b(?:at|in|by)\s+\d+\b[^.\n]{0,20}\bcompan/i,
];

const stringsOf = (v: unknown): string[] =>
  typeof v === 'string'
    ? [v]
    : Array.isArray(v)
      ? v.flatMap(stringsOf)
      : v && typeof v === 'object'
        ? Object.values(v).flatMap(stringsOf)
        : [];

/**
 * Where a step quotes internal interview data. Every string counts (tags, chat lines, code
 * comments), not just prose. Blocking: a lesson that quotes it can't be published.
 */
export function internalDataIssues(section: Section): StyleIssue[] {
  for (const text of [section.title ?? '', ...stringsOf(section.body)]) {
    for (const re of INTERNAL_DATA) {
      const m = text.match(re);
      if (m) {
        return [
          {
            sectionKey: section.key,
            rule: 'internal_data',
            message: `Quotes internal interview data ("${clip(m[0])}"). Use it to choose what to teach, never in the text: say "a common interview question" instead`,
          },
        ];
      }
    }
  }
  return [];
}

/**
 * Where a step breaks the title rule, quotes internal data or goes over the style's word budgets.
 * The budgets are advice for writers and reviewers; internal data also blocks publishing.
 */
export function styleIssues(section: Section, style: StyleKey): StyleIssue[] {
  const b = STYLES[style].budgets;
  const issues: StyleIssue[] = [...titleIssues(section), ...internalDataIssues(section)];
  const r = readabilityOf(section);
  // Interactive and code steps carry their words in code and controls; checks and playbooks run long by nature.
  // A slide deck is read one slide at a time, so its budget grows with the number of slides. Flip
  // and swipe cards are read one card at a time too (e.g. interview questions with model answers),
  // and so is a guided lab: one story step at a time beside its live picture.
  const oneAtATime =
    section.kind === 'SLIDES'
      ? section.body.slides.length
      : section.kind === 'CARD_DECK' &&
          (section.body.layout === 'flip' || section.body.layout === 'swipe')
        ? section.body.cards.length
        : section.kind === 'WIDGET' && 'story' in section.body
          ? section.body.story.length
          : 0;
  // A card's model answer is meant to be said out loud: the direct answer, the formula, why it is
  // that way, a number and the caveat, so that the panel's follow-up is already answered. That is
  // about a minute of speech, far more than one slide's bullet, so a deck gets a larger share.
  const perItem = section.kind === 'CARD_DECK' ? b.stepWords / 1.5 : b.stepWords / 4;
  const stepBudget =
    oneAtATime > 0
      ? Math.max(b.stepWords, oneAtATime * Math.round(perItem))
      : section.kind === 'KNOWLEDGE_CHECK' && section.body.draw
        ? // A quiz pool: one attempt reads only its own draw of questions.
          b.stepWords * 1.6 * Math.ceil(section.body.items.length / section.body.draw)
        : section.kind === 'INTERVIEW_PLAYBOOK' || section.kind === 'KNOWLEDGE_CHECK'
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
