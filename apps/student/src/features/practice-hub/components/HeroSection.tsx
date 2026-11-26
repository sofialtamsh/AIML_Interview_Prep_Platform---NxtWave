import { ArrowRight, ArrowUpRight, Compass } from 'lucide-react';
import { accentOf, iconOf, tintOf } from '../data/categories';
import { track } from '../lib/analytics';
import type { Category, Question } from '../types';
import { DifficultyBadge } from './DifficultyBadge';

interface Props {
  totals: { questions: number; categories: number; courses: number; videos: number };
  categories: Array<Category & { count: number }>;
  starter?: Question;
  onStart: () => void;
  onExplore: () => void;
  onSelectCategory: (id: string) => void;
}

export function HeroSection({
  totals,
  categories,
  starter,
  onStart,
  onExplore,
  onSelectCategory,
}: Props) {
  const stats = [
    { value: totals.questions, label: 'practice questions' },
    { value: totals.categories, label: 'subject areas' },
    { value: totals.courses, label: 'Academy courses' },
    { value: totals.videos, label: 'with concept videos' },
  ].filter((s) => s.value > 0);

  return (
    <section id="top" className="relative isolate overflow-hidden">
      {/* Soft brand glow and a faint grid, behind everything. */}
      <div className="dotgrid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="absolute -top-40 left-1/2 -z-10 h-[34rem] w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_18%,transparent),transparent)]" />
      <div className="absolute top-40 -right-40 -z-10 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--g3)_14%,transparent),transparent)]" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-16 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:pb-24">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 font-mono text-[11px] font-semibold tracking-[0.12em] text-ink-2 uppercase shadow-soft backdrop-blur">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-brand" />
            </span>
            NxtWave <span className="text-line-2">|</span> Career Preparation Program
          </span>
          <h1 className="mt-6 text-[clamp(34px,5.4vw,58px)]">
            Your{' '}
            <span className="bg-[linear-gradient(100deg,var(--brand),var(--g3))] bg-clip-text text-transparent">
              AI/ML Interview Preparation
            </span>{' '}
            Starts Here.
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2">
            Machine learning is at the core of today's AI and data roles. Build your practical
            skills, strengthen your fundamentals, and get ready for real AI/ML interviews through
            structured coding practice.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onStart}
              className="group inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-[15px] font-semibold text-brand-ink shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--brand)_70%,transparent)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Start Practicing
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </button>
            <button
              type="button"
              onClick={onExplore}
              className="inline-flex items-center gap-2 rounded-xl border border-line-2 bg-surface px-5 py-3 text-[15px] font-semibold text-ink transition-colors hover:border-ink/30"
            >
              <Compass className="size-4" aria-hidden /> View Roadmap
            </button>
          </div>
          <dl className="mt-10 grid max-w-xl grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="border-l-2 border-line pl-3">
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-[28px] leading-none font-extrabold text-ink tabular-nums">
                  {s.value}
                </dd>
                <dd className="mt-1.5 text-[12.5px] leading-snug text-muted" aria-hidden>
                  {s.label}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="animate-rise [animation-delay:120ms]">
          <PathCard categories={categories} onSelectCategory={onSelectCategory} starter={starter} />
        </div>
      </div>
    </section>
  );
}

function PathCard({
  categories,
  starter,
  onSelectCategory,
}: Pick<Props, 'categories' | 'starter' | 'onSelectCategory'>) {
  const most = Math.max(1, ...categories.map((c) => c.count));
  return (
    <div className="relative rounded-3xl border border-line bg-surface/90 p-5 shadow-lift backdrop-blur sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <span className="eyebrow">Your practice path</span>
        <span className="font-mono text-[11.5px] text-muted">{categories.length} areas</span>
      </div>
      <ol className="relative mt-4 grid gap-1">
        <span
          className="absolute top-5 bottom-5 left-[19px] w-px bg-[linear-gradient(var(--line-2),var(--line-2))]"
          aria-hidden
        />
        {categories.map((c, i) => {
          const Icon = iconOf(c);
          return (
            <li key={c.id} className="relative">
              <button
                type="button"
                onClick={() => onSelectCategory(c.id)}
                className="group flex w-full items-center gap-3 rounded-xl px-0 py-1.5 text-left transition-colors hover:bg-surface-2"
                aria-label={`${c.name}: ${c.count} questions. Show them.`}
                style={{ animationDelay: `${200 + i * 90}ms` }}
              >
                <span
                  className="relative z-10 grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface"
                  style={{ color: accentOf(c), background: tintOf(c, 12) }}
                >
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[14px] font-semibold text-ink">{c.name}</span>
                    <span className="font-mono text-[12px] text-muted tabular-nums">{c.count}</span>
                  </span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className="block h-full rounded-r-[4px] transition-[width] duration-700"
                      style={{ width: `${(100 * c.count) / most}%`, background: accentOf(c) }}
                    />
                  </span>
                </span>
                <ArrowRight
                  className="size-4 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ol>
      {starter && (
        <div className="animate-float mt-5 rounded-2xl border border-brand/25 bg-brand-soft/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="eyebrow text-brand-deep">Start here</span>
            <DifficultyBadge level={starter.difficulty} />
          </div>
          <p className="mt-2 text-[15px] font-semibold text-ink">{starter.title}</p>
          <p className="mt-0.5 text-[12.5px] text-muted">{starter.course}</p>
          <a
            href={starter.academyUrl}
            target="_blank"
            rel="noopener"
            onClick={() =>
              track('solve_clicked', {
                id: starter.id,
                category: starter.categoryId,
                difficulty: starter.difficulty,
                source: 'hero',
              })
            }
            className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-brand-deep hover:underline"
            aria-label={`Solve ${starter.title} on NxtWave Academy (opens in a new tab)`}
          >
            Solve on NxtWave Academy <ArrowUpRight className="size-4" aria-hidden />
          </a>
        </div>
      )}
    </div>
  );
}
