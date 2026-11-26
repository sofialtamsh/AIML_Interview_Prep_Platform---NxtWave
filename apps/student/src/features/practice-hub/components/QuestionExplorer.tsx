import { Info, ListX } from 'lucide-react';
import { useMemo } from 'react';
import { accentOf, CATEGORY_BY_ID } from '../data/categories';
import { SHOWING_DRAFTS } from '../data/questions';
import { track } from '../lib/analytics';
import { countBy, filterQuestions, groupByCourse } from '../lib/filters';
import type { Category, Difficulty, Filters, Question } from '../types';
import { ALL } from '../types';
import { CategoryTabs, DifficultyFilter } from './FilterControls';
import { QuestionRow } from './QuestionRow';
import { SectionHeading } from './SectionHeading';

interface Props {
  questions: Question[];
  categories: Category[];
  filters: Filters;
  onChange: (next: Partial<Filters>) => void;
}

export function QuestionExplorer({ questions, categories, filters, onChange }: Props) {
  const results = useMemo(() => filterQuestions(questions, filters), [questions, filters]);
  // Facet counts: each control shows what you'd get if you changed only that control.
  const categoryCounts = useMemo(
    () => countBy(filterQuestions(questions, { ...filters, category: ALL }), (q) => q.categoryId),
    [questions, filters],
  );
  const levelCounts = useMemo(
    () => countBy(filterQuestions(questions, { ...filters, difficulty: ALL }), (q) => q.difficulty),
    [questions, filters],
  );
  const groups = useMemo(() => groupByCourse(results), [results]);
  const filtered = filters.category !== ALL || filters.difficulty !== ALL;
  const selected = CATEGORY_BY_ID.get(filters.category);

  const clear = () => onChange({ category: ALL, difficulty: ALL });

  return (
    <section
      id="practice"
      className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24"
      aria-labelledby="practice-title"
    >
      <SectionHeading eyebrow="Practice hub" title="Your Coding Practice Hub" id="practice-title">
        Explore the questions available across our learning portal. Pick a topic, solve questions,
        and strengthen your practical understanding.
      </SectionHeading>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-3">
        <CategoryTabs
          categories={categories}
          value={filters.category}
          counts={categoryCounts}
          total={[...categoryCounts.values()].reduce((a, b) => a + b, 0)}
          onChange={(id) => {
            onChange({ category: id });
            track('category_selected', { category: id, source: 'explorer' });
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <DifficultyFilter
            value={filters.difficulty}
            counts={levelCounts}
            onChange={(d: Difficulty | 'all') => {
              onChange({ difficulty: d });
              track('level_selected', { level: d });
            }}
          />
          <p
            className="flex flex-wrap items-center gap-x-3 text-[14px] text-ink-2"
            aria-live="polite"
          >
            <span>
              <b className="font-display text-ink tabular-nums">{results.length}</b>{' '}
              {results.length === 1 ? 'question' : 'questions'}
              {selected ? (
                <>
                  {' '}
                  in <b className="text-ink">{selected.fullName ?? selected.name}</b>
                </>
              ) : (
                ' across all subjects'
              )}
              {filters.difficulty !== ALL && <> · {filters.difficulty}</>}
            </span>
            {filtered && (
              <button
                type="button"
                onClick={clear}
                className="text-[13.5px] font-semibold text-brand-deep hover:underline"
              >
                Clear filters
              </button>
            )}
          </p>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-surface-2/70 px-3.5 py-2.5 text-[13px] text-ink-2">
        <Info className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
        <span>
          <b className="text-ink">Solve Question</b> opens the exact question on NxtWave Academy in
          a new tab.
          {SHOWING_DRAFTS && (
            <>
              {' '}
              <b className="text-warn">Preview build:</b> questions marked DRAFT are not verified
              yet and are hidden on the live site.
            </>
          )}
        </span>
      </p>

      {results.length === 0 ? (
        <div className="mt-8 grid justify-items-center gap-3 rounded-2xl border border-dashed border-line-2 bg-surface px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-muted">
            <ListX className="size-6" aria-hidden />
          </span>
          <h3 className="font-sans text-[18px] font-bold tracking-tight">
            No questions at this level yet
          </h3>
          <p className="max-w-sm text-[14px] text-ink-2">
            Try another level, or show every subject.
          </p>
          <button
            type="button"
            onClick={clear}
            className="mt-1 rounded-xl bg-ink px-4 py-2.5 text-[14px] font-semibold text-surface"
          >
            Show all questions
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-8">
          {groups.map((g) => {
            const c = CATEGORY_BY_ID.get(g.categoryId);
            const headingId = `course-${g.key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            return (
              <section key={g.key} aria-labelledby={headingId}>
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className="h-6 w-1 rounded-full"
                    style={{ background: c ? accentOf(c) : 'var(--line-2)' }}
                    aria-hidden
                  />
                  <h3 id={headingId} className="font-sans text-[17px] font-bold tracking-tight">
                    {g.course}
                  </h3>
                  <span className="rounded-md bg-surface-2 px-1.5 font-mono text-[12px] text-muted tabular-nums">
                    {g.items.length}
                  </span>
                  {filters.category === ALL && c && c.name !== g.course && (
                    <span className="hidden text-[12.5px] text-muted sm:inline">{c.name}</span>
                  )}
                </div>
                <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
                  {g.items.map((q, i) => (
                    <QuestionRow key={q.id} q={q} n={i + 1} />
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
