import type { Filters, Question } from '../types';
import { ALL } from '../types';

export function filterQuestions(questions: Question[], filters: Filters) {
  return questions.filter(
    (q) =>
      (filters.category === ALL || q.categoryId === filters.category) &&
      (filters.difficulty === ALL || q.difficulty === filters.difficulty),
  );
}

/** Questions grouped by course, in the order courses first appear (the sheet's order). */
export function groupByCourse(questions: Question[]) {
  const groups = new Map<string, Question[]>();
  for (const q of questions) {
    const key = `${q.categoryId}::${q.course}`;
    groups.set(key, [...(groups.get(key) ?? []), q]);
  }
  return [...groups.entries()].map(([key, items]) => ({
    key,
    course: items[0]?.course ?? '',
    categoryId: items[0]?.categoryId ?? '',
    items,
  }));
}

export const countBy = <K extends string>(questions: Question[], key: (q: Question) => K) =>
  questions.reduce((m, q) => m.set(key(q), (m.get(key(q)) ?? 0) + 1), new Map<K, number>());
