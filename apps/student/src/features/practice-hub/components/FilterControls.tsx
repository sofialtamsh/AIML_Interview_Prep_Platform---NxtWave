import { accentOf } from '../data/categories';
import type { Category, Difficulty } from '../types';
import { ALL, DIFFICULTIES } from '../types';

/** "All Questions" plus one tab per subject, each with a live count. Scrolls sideways on phones. */
export function CategoryTabs({
  categories,
  value,
  counts,
  total,
  onChange,
}: {
  categories: Category[];
  value: string;
  counts: Map<string, number>;
  total: number;
  onChange: (id: string) => void;
}) {
  const tabs = [{ id: ALL, label: 'All Questions', count: total, color: 'var(--ink)' }].concat(
    categories.map((c) => ({
      id: c.id,
      label: c.short,
      count: counts.get(c.id) ?? 0,
      color: accentOf(c),
    })),
  );
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Subject</legend>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {tabs.map((t) => {
          const on = t.id === value;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(t.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-[13.5px] font-semibold whitespace-nowrap transition-all ${
                on
                  ? 'border-ink bg-ink text-surface shadow-soft'
                  : 'border-line bg-surface text-ink-2 hover:border-line-2 hover:text-ink'
              }`}
            >
              {t.id !== ALL && (
                <span className="size-2 rounded-full" style={{ background: t.color }} aria-hidden />
              )}
              {t.label}
              <span
                className={`rounded-md px-1.5 font-mono text-[11.5px] tabular-nums ${
                  on ? 'bg-surface/15 text-surface' : 'bg-surface-2 text-muted'
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** All Levels, Beginner, Intermediate, Advanced: a segmented control. */
export function DifficultyFilter({
  value,
  counts,
  onChange,
}: {
  value: Difficulty | 'all';
  counts: Map<string, number>;
  onChange: (v: Difficulty | 'all') => void;
}) {
  const options: Array<{ id: Difficulty | 'all'; label: string }> = [
    { id: ALL, label: 'All Levels' },
    ...DIFFICULTIES.map((d) => ({ id: d, label: d })),
  ];
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Difficulty</legend>
      <div className="flex h-11 overflow-x-auto rounded-xl border border-line-2 bg-surface p-1 shadow-soft [scrollbar-width:none]">
        {options.map((o) => {
          const on = o.id === value;
          const n = o.id === ALL ? undefined : (counts.get(o.id) ?? 0);
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                on ? 'bg-brand text-brand-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink'
              }`}
            >
              {o.label}
              {n !== undefined && (
                <span className={`font-mono text-[11px] ${on ? 'opacity-80' : 'text-muted'}`}>
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
