/**
 * Pure lesson logic shared by the API and the apps: depth resolution, fast-track,
 * time estimates and grading (docs/05-personalization-engine.md §1.3–1.4).
 */
import type { CheckItem, Section } from './schema';
import type { CheckResponse, CheckResult } from './student';

// ───────────── Depth resolution ─────────────

type Resolvable = Pick<Section, 'key' | 'kind' | 'depthRank' | 'slotKey' | 'roleScope'>;

/** Hooks, checks, hands-on practice and summaries always stay in full. */
const NEVER_FAST_TRACK = new Set<Section['kind']>([
  'HOOK',
  'KNOWLEDGE_CHECK',
  'PLAYGROUND',
  'SUMMARY',
]);

/**
 * Prior knowledge turns basics into skippable refreshers. It never removes content and
 * never lowers the depth: confident (3) → sections 2+ levels below the target;
 * comfortable (2) → foundational sections only.
 */
export function isFastTrack(
  s: Pick<Section, 'kind' | 'depthRank'>,
  depth: number,
  skillLevel: number,
) {
  if (NEVER_FAST_TRACK.has(s.kind)) return false;
  if (skillLevel >= 3) return s.depthRank <= depth - 2;
  if (skillLevel === 2) return s.depthRank <= 1 && depth > 1;
  return false;
}

/**
 * The sections one student sees, in authored order:
 *   1. role scope — drop sections scoped to other roles
 *   2. depth — additive sections at or below the depth; for each slot, only the deepest variant
 *   3. fast-track flags from prior knowledge
 */
export function resolveSections<T extends Resolvable>(
  sections: T[],
  opts: { depth: number; roleSlug: string | null; skillLevel: number },
): Array<T & { fastTrack: boolean }> {
  const inRole = sections.filter(
    (s) =>
      s.roleScope.length === 0 || (opts.roleSlug !== null && s.roleScope.includes(opts.roleSlug)),
  );
  const visible = inRole.filter((s) => s.depthRank <= opts.depth);
  const deepestInSlot = new Map<string, T>();
  for (const s of visible) {
    if (!s.slotKey) continue;
    const best = deepestInSlot.get(s.slotKey);
    if (!best || s.depthRank > best.depthRank) deepestInSlot.set(s.slotKey, s);
  }
  return visible
    .filter((s) => !s.slotKey || deepestInSlot.get(s.slotKey) === s)
    .map((s) => ({ ...s, fastTrack: isFastTrack(s, opts.depth, opts.skillLevel) }));
}

// ───────────── Time estimates ─────────────

const WPM = 180;
const words = (s: string) => (s.match(/\S+/g) ?? []).length;

/** Every human-readable string in a body, for a reading-time estimate. */
function textOf(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.flatMap(textOf);
  if (v && typeof v === 'object') return Object.values(v).flatMap(textOf);
  return [];
}

/** Reading time plus defaults for activities (docs/05 §1.4). Minimum one minute. */
export function estimateSectionMinutes(s: Section): number {
  if (s.estimatedMinutes) return s.estimatedMinutes;
  let seconds = (textOf(s.body).reduce((a, t) => a + words(t), 0) / WPM) * 60;
  switch (s.kind) {
    case 'CARD_DECK':
      seconds += s.body.cards.length * 30;
      break;
    case 'DIAGRAM':
      seconds += s.body.steps.length * 20;
      break;
    case 'KNOWLEDGE_CHECK':
      seconds += s.body.items.length * 45;
      break;
    case 'CODE_EXAMPLE':
      seconds += s.body.runnable ? 120 : 30;
      break;
    case 'CODE_EXPLORER':
    case 'WIDGET':
      seconds += 120;
      break;
    case 'PLAYGROUND':
      seconds += 300;
      break;
    default:
      break;
  }
  return Math.max(1, Math.round(seconds / 60));
}

/** Fast-tracked refreshers take about 30% of the time. */
export const lessonMinutes = (sections: Array<{ estimatedMinutes: number; fastTrack: boolean }>) =>
  Math.max(
    1,
    Math.round(sections.reduce((a, s) => a + s.estimatedMinutes * (s.fastTrack ? 0.3 : 1), 0)),
  );

// ───────────── Grading ─────────────

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/^[`'"]+|[`'"]+$/g, '')
    .replace(/\(\)$/, '')
    .replace(/\s+/g, ' ');

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

/** Grades one item on the server and returns what may be revealed afterwards. */
export function gradeItem(item: CheckItem, response: CheckResponse): CheckResult | null {
  if (item.type !== response.type) return null;
  switch (item.type) {
    case 'mcq':
    case 'predict_output': {
      const r = response as Extract<CheckResponse, { type: 'mcq' | 'predict_output' }>;
      return {
        correct: item.answer.correct[0] === r.choice,
        explanation: item.explanation,
        reveal: { correct: item.answer.correct },
      };
    }
    case 'multi': {
      const r = response as Extract<CheckResponse, { type: 'multi' }>;
      return {
        correct: sameSet([...new Set(r.choices)], item.answer.correct),
        explanation: item.explanation,
        reveal: { correct: item.answer.correct },
      };
    }
    case 'fill_blank': {
      const r = response as Extract<CheckResponse, { type: 'fill_blank' }>;
      const correct = Object.entries(item.answer).every(([blank, accepted]) =>
        accepted.some((a) => norm(a) === norm(r.blanks[blank] ?? '')),
      );
      return {
        correct,
        explanation: item.explanation,
        reveal: {
          answers: Object.fromEntries(Object.entries(item.answer).map(([b, a]) => [b, a[0] ?? ''])),
        },
      };
    }
    case 'order_steps': {
      const r = response as Extract<CheckResponse, { type: 'order_steps' }>;
      return {
        correct:
          r.order.length === item.answer.order.length &&
          r.order.every((id, i) => id === item.answer.order[i]),
        explanation: item.explanation,
        reveal: { order: item.answer.order },
      };
    }
    case 'reasoning': {
      const r = response as Extract<CheckResponse, { type: 'reasoning' }>;
      return {
        correct: r.selfRating === undefined ? null : r.selfRating === 'got_it',
        reveal: { modelAnswer: item.modelAnswer, rubric: item.rubric },
      };
    }
  }
}

/**
 * The canonical form of a section: tag lists sorted and de-duplicated, so the same content
 * always serialises (and hashes) the same way however it was authored.
 */
export function canonicalSection(s: Section): Section {
  return {
    ...s,
    roleScope: [...new Set(s.roleScope)].sort(),
    conceptKeys: [...new Set(s.conceptKeys)].sort(),
  };
}

/** A quick, non-cryptographic fingerprint (the API stores SHA-256 of `canonicalJson`). */
export function contentHash(s: Section): string {
  const json = canonicalJson(canonicalSection(s));
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < json.length; i++) {
    const c = json.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

/** JSON with sorted keys and no undefined members: equal values give equal strings. */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v)
      .sort()
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((v as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
}
