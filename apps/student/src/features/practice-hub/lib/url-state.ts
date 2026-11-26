import type { Difficulty, Filters } from '../types';
import { ALL, DIFFICULTIES } from '../types';

/**
 * Filters live in the URL (?topic=ml&level=Beginner), so a mentor can share a link like
 * "solve the ML questions" on WhatsApp and it opens with those filters set.
 */
export function readFilters(validCategories: string[]): Filters {
  const p = new URLSearchParams(window.location.search);
  const category = p.get('topic') ?? ALL;
  const level = p.get('level') ?? ALL;
  return {
    category: validCategories.includes(category) ? category : ALL,
    difficulty: (DIFFICULTIES as string[]).includes(level) ? (level as Difficulty) : ALL,
  };
}

export function writeFilters(f: Filters) {
  const p = new URLSearchParams(window.location.search);
  const set = (key: string, value: string, empty: string) => {
    if (value && value !== empty) p.set(key, value);
    else p.delete(key);
  };
  set('topic', f.category, ALL);
  set('level', f.difficulty, ALL);
  const qs = p.toString();
  const url = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', url);
}
