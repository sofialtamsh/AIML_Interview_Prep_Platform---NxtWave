/**
 * Play mode for slide decks: what the narrator says on a slide, and how long it stays up.
 *
 * The narrator explains a slide, it does not read it out. A slide may carry its own script
 * (`narration`, used as is: every code slide has one, so code is explained, never spelled out).
 * Otherwise the script is built from the slide: a short lead-in, the headline, the body, the
 * points joined the way a person would say them, and the picture described in words.
 */
import type { Slide } from '@app/content';
import { richToPlain } from './rich-parse';

/** Symbols and short forms, the way a person says them. */
const SPOKEN: ReadonlyArray<readonly [RegExp, string]> = [
  [/₹\s?([\d][\d,.]*\d|\d)/g, '$1 rupees'],
  [/\s*(→|->|⇒)\s*/g, ' gives '],
  [/\s*≥\s*/g, ' at least '],
  [/\s*≤\s*/g, ' at most '],
  [/\s*≈\s*/g, ' about '],
  [/\s*×\s*/g, ' times '],
  [/\s*÷\s*/g, ' divided by '],
  [/\s+[−–]\s+(?=\d)/g, ' minus '],
  [/\s+\+\s+/g, ' plus '],
  [/\s+=\s+/g, ' equals '],
  [/(\d)\s?%/g, '$1 percent'],
  [/\s+&\s+/g, ' and '],
  [/\s+·\s+/g, ', '],
  [/\be\.g\.,?/gi, 'for example,'],
  [/\bi\.e\.,?/gi, 'that is,'],
  [/\bvs\.?(?=\s)/gi, 'versus'],
  [/[`*_#|<>{}[\]\\]/g, ' '],
];

/** One piece of slide text as a spoken sentence. */
export function spoken(text: string): string {
  let t = richToPlain(text);
  for (const [from, to] of SPOKEN) t = t.replace(from, to);
  t = t.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return /[.!?:]$/.test(t) ? t.replace(/:$/, '.') : `${t}.`;
}

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};
const pick = (options: readonly string[], seed: string) =>
  options[hash(seed) % options.length] ?? '';

const STORY = [
  "Let's start with a simple picture.",
  "Here's an everyday way to think about it.",
  'Picture this.',
] as const;
const PLAIN = [
  '',
  "Here's the key idea.",
  '',
  "Let's look a little closer.",
  'Moving on.',
] as const;
const ORDER = ['First,', 'Then,', 'Also,', 'And finally,'] as const;

function leadIn(slide: Slide): string {
  const kicker = (slide.kicker ?? '').toLowerCase();
  if (slide.try) return "Now it's your turn.";
  if (kicker.includes('story')) return pick(STORY, slide.title);
  if (kicker.includes('code')) return "Now let's see it in code.";
  return pick(PLAIN, slide.title);
}

/** Bullets, joined the way a person lists things aloud. */
function pointsAloud(points: readonly string[]): string[] {
  if (points.length === 1) return [spoken(points[0] ?? '')];
  return points.map((p, i) => {
    const word = i === points.length - 1 && points.length > 2 ? ORDER[3] : (ORDER[i] ?? 'Also,');
    return `${word} ${spoken(p)}`;
  });
}

/** Code is explained, never spelled out: its comments say what it does. */
function codeAloud(code: string, output: string | undefined): string[] {
  const comments = code
    .split('\n')
    .map((line) => /#\s*(.+)$/.exec(line)?.[1]?.trim())
    .filter((c): c is string => Boolean(c))
    .slice(0, 3);
  const parts = comments.length
    ? ['Look at the code on the slide.', ...comments.map((c) => spoken(c))]
    : ['Take a moment to read the code on the slide.'];
  const out = output?.trim();
  if (out && !out.includes('\n') && out.length <= 60 && /^[\w\s.,:'"/-]+$/.test(out))
    parts.push(`Run it, and it prints: ${spoken(out)}`);
  else if (out) parts.push('The output is shown just below the code.');
  return parts;
}

function visualAloud(visual: NonNullable<Slide['visual']>): string[] {
  switch (visual.type) {
    case 'icons':
      return visual.items.map((it) => spoken(it.sub ? `${it.label}: ${it.sub}` : it.label));
    case 'compare': {
      const side = (s: { title: string; items: string[] }) =>
        `${spoken(s.title).replace(/\.$/, '')}: ${s.items.map((i) => spoken(i)).join(' ')}`;
      const parts = [
        'Compare the two sides.',
        side(visual.left),
        `On the other side, ${side(visual.right)}`,
      ];
      if (visual.better !== 'none')
        parts.push(
          `${spoken(visual[visual.better].title).replace(/\.$/, '')} is the better choice.`,
        );
      return parts;
    }
    case 'flow':
      return [`It goes step by step: ${visual.steps.map((s) => s.label).join(', then ')}.`].map(
        spoken,
      );
    case 'stat':
      return [spoken(`${visual.value}: ${visual.label}`), visual.sub ? spoken(visual.sub) : ''];
    case 'sequence':
      return [spoken(`The numbers go: ${visual.terms.join(', ')}`)];
    case 'table':
      // Reading cells aloud helps nobody; name the columns and let the eye do the rest.
      return [
        spoken(`The table has one row per example, with columns: ${visual.columns.join(', ')}`),
      ];
    case 'checklist':
      return visual.items.map((it) => spoken(`${it.ok ? 'Yes' : 'No'}: ${it.text}`));
    case 'chat':
      return visual.lines.map((l) =>
        spoken(`${l.from === 'candidate' ? 'You say' : 'The interviewer says'}: ${l.text}`),
      );
    case 'quote':
      return [spoken(visual.text)];
    case 'emoji':
      return visual.caption ? [spoken(visual.caption)] : [];
    case 'code':
      return codeAloud(visual.code, visual.output);
  }
}

function captionAloud(caption: string): string {
  const real = /^real use:\s*(.+)$/i.exec(caption);
  return real ? spoken(`You will see this in real products: ${real[1]}`) : spoken(caption);
}

/** What the narrator says on a slide. */
export function narrationOf(slide: Slide): string {
  if (slide.narration) return spoken(slide.narration);
  const parts: string[] = [leadIn(slide), spoken(slide.title)];
  if (slide.body) parts.push(spoken(slide.body));
  parts.push(...pointsAloud(slide.points));
  if (slide.visual) parts.push(...visualAloud(slide.visual));
  if (slide.try) parts.push(spoken(slide.try.prompt));
  if (slide.note) parts.push(spoken(slide.note));
  if (slide.animation?.caption) parts.push(captionAloud(slide.animation.caption));
  return parts.filter(Boolean).join(' ');
}

/** The script cut into short pieces: long utterances get cut off by some browser voices. */
export function narrationChunks(text: string, max = 190): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+["')]*|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  for (const s of sentences.map((x) => x.trim()).filter(Boolean)) {
    const last = chunks[chunks.length - 1];
    if (last !== undefined && last.length + s.length + 1 <= max)
      chunks[chunks.length - 1] = `${last} ${s}`;
    else chunks.push(s);
  }
  return chunks;
}

/** How long a slide stays up without a voice: reading time, plus a beat to watch the picture. */
export function slideMillis(slide: Slide): number {
  const words = narrationOf(slide).split(/\s+/).filter(Boolean).length;
  const base = (words / 3) * 1000 + 2500 + (slide.animation ? 4000 : 0);
  return Math.round(Math.min(30_000, Math.max(5000, base)));
}
