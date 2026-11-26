import type { Difficulty, StudentPracticeQuestion } from '@app/contracts';
import { Alert, Button, buttonClass, Card, Chip, EmptyState, errorMessage, Spinner } from '@app/ui';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { DIFFICULTY, QuestionRow } from '../../features/practice/QuestionRow';
import { SELF_PACED } from '../../lib/features';
import { useGoal, usePractice } from '../../lib/queries';

const LEVELS: Difficulty[] = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'];

/**
 * The Practice tab: every interview question for the student's role, with its tags and details.
 * Solving happens on the NxtWave learning portal (students sign in there with their NxtWave
 * account); "Solve" opens the question in a new tab and records that it was opened. Topic pages
 * list the same questions for one topic; `?topic=slug` opens this tab filtered to it.
 */
export function PracticePage() {
  const practice = usePractice();
  const goal = useGoal();
  const [params, setParams] = useSearchParams();
  const topic = params.get('topic');
  const setTopic = (slug: string | null) =>
    setParams(slug ? { topic: slug } : {}, { replace: true });
  const [category, setCategory] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [query, setQuery] = useState('');

  const items = practice.data?.items ?? [];
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!topic || i.tags.some((t) => t.topicSlug === topic)) &&
        (!category || i.category === category) &&
        (!difficulty || i.difficulty === difficulty) &&
        (!q || searchText(i).includes(q)),
    );
  }, [items, topic, category, difficulty, query]);
  const groups = useMemo(() => {
    const map = new Map<string, StudentPracticeQuestion[]>();
    for (const q of shown) map.set(q.category, [...(map.get(q.category) ?? []), q]);
    return [...map];
  }, [shown]);
  const numberOf = useMemo(() => new Map(items.map((q, i) => [q.id, i + 1])), [items]);

  if (practice.isPending) return <Spinner />;
  if (practice.isError) return <Alert tone="bad">{errorMessage(practice.error)}</Alert>;

  const role = goal.data?.goal?.role.title ?? 'your role';
  const opened = items.filter((q) => q.openedAt).length;
  const levels = LEVELS.filter((d) => items.some((q) => q.difficulty === d));
  const filtered = Boolean(topic || category || difficulty || query.trim());
  const topics = practice.data.topics;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 animate-rise">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="eyebrow">Practice</span>
          <h1 className="mt-1.5 text-[clamp(24px,2.8vw,32px)]">Interview practice</h1>
          <p className="mt-1.5 max-w-[62ch] text-ink-2">
            Real interview questions for <b>{role}</b>. Tap <b>Solve</b> to open a question on the
            NxtWave learning portal, signed in with your NxtWave account.
          </p>
        </div>
        {items.length > 0 && (
          <div className="rounded-xl border border-line bg-surface px-4 py-2.5 text-right">
            <div className="eyebrow">Opened</div>
            <div className="font-display text-xl font-bold tabular-nums">
              {opened}
              <span className="text-[15px] text-muted">/{items.length}</span>
            </div>
          </div>
        )}
      </header>

      {items.length === 0 ? (
        <Card>
          <EmptyState title="Questions are on their way">
            Your mentors are adding interview questions for {role}. Meanwhile, keep going with your{' '}
            {SELF_PACED ? 'units' : 'roadmap'}: every lesson you finish makes these easier.
            <div className="mt-4">
              <Link to={SELF_PACED ? '/' : '/roadmap'} className={buttonClass('secondary', 'sm')}>
                {SELF_PACED ? 'Go to Learn' : 'Go to my roadmap'}
              </Link>
            </div>
          </EmptyState>
        </Card>
      ) : (
        <>
          <HowItWorks />
          <div className="grid gap-3">
            <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand-soft">
              <Search className="size-4 text-muted" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions"
                aria-label="Search questions"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] outline-none placeholder:text-muted"
              />
            </label>
            {topics.length > 0 && (
              <label className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
                Topic
                <select
                  value={topic ?? ''}
                  onChange={(e) => setTopic(e.target.value || null)}
                  className="min-w-0 max-w-full rounded-[10px] border border-line-2 bg-surface px-3 py-1.5 text-[13.5px] text-ink"
                >
                  <option value="">All topics</option>
                  {topics.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.title} ({t.count})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <fieldset className="flex min-w-0 flex-wrap gap-2">
              <legend className="sr-only">Category</legend>
              <Chip selected={!category} onClick={() => setCategory(null)}>
                All <span className="font-mono text-[11px] opacity-70">{items.length}</span>
              </Chip>
              {practice.data.categories.map((c) => (
                <Chip
                  key={c.name}
                  selected={category === c.name}
                  onClick={() => setCategory(category === c.name ? null : c.name)}
                >
                  {c.name} <span className="font-mono text-[11px] opacity-70">{c.count}</span>
                </Chip>
              ))}
            </fieldset>
            {levels.length > 1 && (
              <fieldset className="flex min-w-0 flex-wrap gap-2">
                <legend className="sr-only">Difficulty</legend>
                {levels.map((d) => (
                  <Chip
                    key={d}
                    selected={difficulty === d}
                    onClick={() => setDifficulty(difficulty === d ? null : d)}
                  >
                    {DIFFICULTY[d].label}
                  </Chip>
                ))}
              </fieldset>
            )}
          </div>

          {shown.length === 0 ? (
            <Card>
              <EmptyState title="No questions match">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setTopic(null);
                    setCategory(null);
                    setDifficulty(null);
                    setQuery('');
                  }}
                >
                  Clear filters
                </Button>
              </EmptyState>
            </Card>
          ) : (
            <div className="grid gap-4">
              {groups.map(([name, qs]) => (
                <Card key={name} className="overflow-hidden">
                  <div className="flex items-baseline justify-between gap-3 border-b border-line bg-surface-2/60 px-4 py-3 sm:px-5">
                    <h2 className="text-[15px]">{name}</h2>
                    <span className="text-[12.5px] text-muted">
                      {qs.filter((q) => q.openedAt).length}/{qs.length} opened
                      {filtered ? ' · filtered' : ''}
                    </span>
                  </div>
                  <ul className="divide-y divide-line">
                    {qs.map((q) => (
                      <QuestionRow key={q.id} q={q} n={numberOf.get(q.id) ?? 0} />
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    'Tap Solve: the question opens in a new tab on the learning portal.',
    'Sign in with your NxtWave account if it asks.',
    SELF_PACED
      ? 'Come back here for the next one. Stuck? Learn the idea first on the Learn tab.'
      : 'Come back here for the next one. Stuck? Learn the idea first on your roadmap.',
  ];
  return (
    <ol className="grid gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:grid-cols-3">
      {steps.map((s, i) => (
        <li key={s} className="flex gap-2.5 text-[13.5px] text-ink-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-brand-soft font-mono text-[12px] font-bold text-brand">
            {i + 1}
          </span>
          {s}
        </li>
      ))}
    </ol>
  );
}

/** Everything a student might search by: name, details, tags and companies. */
function searchText(q: StudentPracticeQuestion) {
  const tags = q.tags.map((t) => `${t.topicTitle} ${t.subtopicTitle ?? ''}`).join(' ');
  return [q.title, q.category, q.skill, q.description, q.askedAt.join(' '), tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
