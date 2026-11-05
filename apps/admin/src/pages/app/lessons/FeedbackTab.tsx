import type { LessonFeedbackResponse, LessonVersionResponse } from '@app/contracts';
import { Alert, Card, EmptyState, errorMessage, Spinner } from '@app/ui';
import { useQuery } from '@tanstack/react-query';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { timeAgo } from '../../../components/table';
import { api } from '../../../lib/api';
import { lessonKeys } from './shared';

const TAG: Record<string, string> = {
  too_fast: 'Too fast',
  hard_words: 'Hard words',
  visual_unclear: "Visual didn't help",
  content_error: 'Looks wrong',
  too_basic: 'Too basic',
  clear_examples: 'Clear examples',
  fun_to_explore: 'Fun to explore',
  right_depth: 'Right depth',
  too_long: 'Too long',
  too_hard: 'Too hard',
  too_easy: 'Too easy',
  want_more_practice: 'Wants more practice',
};

/** What students said, across every version. Students stay anonymous here. */
export function FeedbackTab({ subtopicId, v }: { subtopicId: string; v: LessonVersionResponse }) {
  const fb = useQuery({
    queryKey: lessonKeys.feedback(subtopicId),
    queryFn: () => api.get<LessonFeedbackResponse>(`/content/lessons/${subtopicId}/feedback`),
  });
  if (fb.isPending) return <Spinner />;
  if (fb.isError) return <Alert tone="bad">{errorMessage(fb.error)}</Alert>;
  const d = fb.data;
  const title = new Map(v.document.sections.map((s) => [s.key, s.title ?? s.key]));

  if (d.rating.count === 0 && d.sections.length === 0 && d.comments.length === 0) {
    return (
      <Card>
        <EmptyState title="No feedback yet">
          Once students take this lesson, their ratings, thumbs on each step and comments appear
          here.
        </EmptyState>
      </Card>
    );
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="grid content-start gap-4">
        <Card className="p-4">
          <span className="eyebrow">Lesson rating</span>
          <div className="mt-1 font-display text-[32px] font-bold">
            {d.rating.average ?? '–'}
            <span className="text-[15px] font-medium text-muted"> / 5</span>
          </div>
          <span className="text-[12.5px] text-muted">from {d.rating.count} students</span>
        </Card>
        <Card className="grid gap-2 p-4">
          <span className="eyebrow">Steps students flagged</span>
          {d.sections.length === 0 && <span className="text-[13px] text-muted">None yet.</span>}
          {d.sections.map((s) => (
            <div key={s.sectionKey} className="grid gap-1 border-b border-line pb-2 last:border-0">
              <div className="flex items-center justify-between gap-2 text-[13px]">
                <span className="truncate font-medium">
                  {title.get(s.sectionKey) ?? s.sectionKey}
                </span>
                <span className="flex shrink-0 items-center gap-2 font-mono text-[12px]">
                  <span className="inline-flex items-center gap-0.5 text-ok">
                    <ThumbsUp className="size-3" aria-label="Helpful" /> {s.up}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-bad">
                    <ThumbsDown className="size-3" aria-label="Not clear" /> {s.down}
                  </span>
                </span>
              </div>
              {Object.keys(s.tags).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(s.tags).map(([t, n]) => (
                    <span
                      key={t}
                      className="rounded-md bg-bad-bg px-1.5 py-px text-[11px] text-bad"
                    >
                      {TAG[t] ?? t} · {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Card>
      </div>
      <Card className="grid content-start gap-3 p-4">
        <span className="eyebrow">Comments</span>
        {d.comments.length === 0 && (
          <span className="text-[13px] text-muted">No written comments yet.</span>
        )}
        <ul className="grid gap-2.5">
          {d.comments.map((c) => (
            <li
              key={`${c.createdAt}-${c.text.slice(0, 20)}`}
              className="rounded-xl border border-line px-3.5 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-x-2 text-[11.5px] text-muted">
                <span>
                  {c.target === 'LESSON'
                    ? `Lesson rating ${c.rating ?? ''}/5`
                    : `Step ${title.get(c.sectionKey ?? '') ?? c.sectionKey}`}
                </span>
                <span>· v{c.versionNumber}</span>
                <span>· {timeAgo(c.createdAt)}</span>
                {c.tags.map((t) => (
                  <span key={t} className="rounded bg-surface-2 px-1">
                    {TAG[t] ?? t}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-[13.5px] whitespace-pre-wrap">{c.text}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
