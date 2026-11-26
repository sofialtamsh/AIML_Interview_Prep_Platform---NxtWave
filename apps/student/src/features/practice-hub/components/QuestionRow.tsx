import { ArrowUpRight, CirclePlay, FlaskConical, Rocket } from 'lucide-react';
import { track } from '../lib/analytics';
import type { Question, QuestionType } from '../types';
import { DifficultyBadge } from './DifficultyBadge';

/** Almost every question is coding, so only the other types get a tag. */
const TYPE_TAG: Partial<Record<QuestionType, typeof Rocket>> = {
  Practical: FlaskConical,
  Project: Rocket,
};

const plain = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
/** True when the title already names the topic ("Boosting" / "Boosting"). */
const saysTopic = (q: Question) => plain(q.title).includes(plain(q.topic));

/**
 * One question as a list row: number, title and topic, level, then the Academy links.
 * On wide screens it is a single line; on phones the level and links sit under the title.
 */
export function QuestionRow({ q, n }: { q: Question; n: number }) {
  const TypeIcon = TYPE_TAG[q.type];
  const props = { id: q.id, category: q.categoryId, difficulty: q.difficulty };
  return (
    <li className="grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-2.5 px-4 py-3.5 transition-colors hover:bg-surface-2/60 sm:px-5 lg:grid-cols-[1.75rem_minmax(0,1fr)_8.5rem_18.5rem] lg:items-center lg:py-3">
      <span className="hidden font-mono text-[12.5px] text-muted tabular-nums lg:block">
        {String(n).padStart(2, '0')}
      </span>

      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] leading-snug font-semibold text-ink">
          <span>{q.title}</span>
          {TypeIcon && (
            <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11.5px] font-medium text-ink-2">
              <TypeIcon className="size-3.5" aria-hidden /> {q.type}
            </span>
          )}
          {q.draft && (
            <span
              className="rounded-md border border-dashed border-warn px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-warn"
              title="Preview only: this link has not been verified yet"
            >
              DRAFT
            </span>
          )}
        </p>
        {/* On phones the level sits beside the topic; on wide screens it has its own column.
            The course is the group heading above, so the topic shows only when it adds something. */}
        <p
          className={`mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted lg:mt-0.5 ${saysTopic(q) ? 'lg:hidden' : ''}`}
        >
          <span className="lg:hidden">
            <DifficultyBadge level={q.difficulty} />
          </span>
          {!saysTopic(q) && <span>{q.topic}</span>}
        </p>
      </div>

      <span className="hidden lg:block lg:justify-self-start">
        <DifficultyBadge level={q.difficulty} />
      </span>

      <div className="lg:justify-self-end">
        <div className="flex items-center gap-1">
          {q.videoUrl && (
            <a
              href={q.videoUrl}
              target="_blank"
              rel="noopener"
              onClick={() => track('concept_clicked', props)}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[13px] font-semibold whitespace-nowrap text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label={`Watch the concept for ${q.title} on NxtWave Academy (opens in a new tab)`}
            >
              <CirclePlay className="size-4" aria-hidden /> Watch concept
            </a>
          )}
          <a
            href={q.academyUrl}
            target="_blank"
            rel="noopener"
            onClick={() => track('solve_clicked', { ...props, source: 'explorer' })}
            className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-[13px] font-semibold whitespace-nowrap text-brand-ink transition-transform hover:-translate-y-px active:translate-y-0"
            aria-label={`Solve ${q.title} on NxtWave Academy (opens in a new tab)`}
          >
            Solve Question <ArrowUpRight className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </li>
  );
}
