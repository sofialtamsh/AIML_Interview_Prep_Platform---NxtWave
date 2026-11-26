import type { AdminFeedbackResponse, FeedbackKind } from '@app/contracts';
import {
  Alert,
  Badge,
  type BadgeTone,
  Button,
  Card,
  cn,
  EmptyState,
  errorMessage,
  Spinner,
} from '@app/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { MessageSquareQuote, Star, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { PageHeader, timeAgo } from '../../components/table';
import { api } from '../../lib/api';

const KIND: Record<FeedbackKind, { label: string; tone: BadgeTone }> = {
  LESSON: { label: 'Lesson', tone: 'next' },
  SECTION: { label: 'Lesson step', tone: 'neutral' },
  PRACTICE_QUESTION: { label: 'Practice question', tone: 'live' },
  PAGE: { label: 'Page', tone: 'planned' },
};

/** Readable names for the tags students pick (lessons, steps, pages and questions). */
const TAG: Record<string, string> = {
  too_fast: 'Too fast',
  hard_words: 'Hard words',
  visual_unclear: "Visual didn't help",
  content_error: 'Something looks wrong',
  too_basic: 'Too basic',
  clear_examples: 'Clear examples',
  fun_to_explore: 'Fun to explore',
  right_depth: 'Right depth',
  too_long: 'Too long',
  too_hard: 'Too hard',
  too_easy: 'Too easy',
  want_more_practice: 'Wants more practice',
  idea: 'Idea',
  bug: 'Bug',
  confusing: 'Confusing',
  praise: 'Praise',
  statement_unclear: 'Question not clear',
  portal_problem: 'Portal problem',
  tests_wrong: 'Test cases wrong',
  good_practice: 'Good practice',
  right_difficulty: 'Right difficulty',
  clear_statement: 'Clear question',
  lesson_helped: 'Lesson helped',
};
const FACES = ['😣', '😕', '😐', '🙂', '🤩'];

/**
 * Airbnb's 11-star method, applied to "prepare for one interview topic": design past five stars,
 * then build the best stars we can. The marks show where the pilot is today and what is next.
 */
const STAR11: Array<[number, string]> = [
  [1, 'The question link is broken. You cannot even start.'],
  [2, 'The question opens, but it is not clear what to do.'],
  [3, 'You study alone from a syllabus, with no plan and no help.'],
  [4, 'A lesson explains each idea before you solve a question.'],
  [
    5,
    'Lessons are interactive, a roadmap tracks progress, and there is a daily plan. This is what students expect.',
  ],
  [
    6,
    'Your mentors set the daily target, every topic is built from real interview questions, practice links straight to the portal, and every step asks for feedback.',
  ],
  [
    7,
    'Solved status syncs from the portal, hints point to your exact mistake, and the next question picks itself.',
  ],
  [
    8,
    'Weak topics come back before you forget them, and the plan adapts on its own when you miss a day.',
  ],
  [
    9,
    'Mock interviews: a timer, you explain aloud, and AI scores you against what companies actually ask.',
  ],
  [10, 'A mentor reviews your week and runs a mock interview with you.'],
  [
    11,
    'The platform tells you the day you are ready, lines up interviews with partner companies, and you get the offer.',
  ],
];
const STAR_MARK: Record<number, { label: string; tone: BadgeTone }> = {
  6: { label: 'Pilot today', tone: 'live' },
  7: { label: 'Next target', tone: 'next' },
};

export function FeedbackPage() {
  const [kind, setKind] = useState<FeedbackKind | ''>('');
  const [withText, setWithText] = useState(false);
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['admin', 'feedback', kind, withText, page],
    queryFn: () =>
      api.get<AdminFeedbackResponse>(
        `/feedback/?page=${page}${kind ? `&kind=${kind}` : ''}${withText ? '&withText=true' : ''}`,
      ),
    placeholderData: keepPreviousData,
  });
  const data = query.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / 25)) : 1;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 animate-rise">
      <PageHeader
        eyebrow="Students"
        title="Feedback & 11★ ideas"
        sub="Every rating students give: lesson steps, lessons, practice questions and pages. Each full rating asks the 11★ question: what would make this an unforgettable experience?"
      />
      <ElevenStarMap />

      {query.isPending && <Spinner />}
      {query.isError && <Alert tone="bad">{errorMessage(query.error)}</Alert>}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {data.summary.map((s) => (
              <Card key={s.kind} className="p-4">
                <div className="eyebrow">{KIND[s.kind].label}</div>
                <div className="mt-1.5 font-display text-[26px] font-bold tabular-nums">
                  {s.count}
                </div>
                <div className="text-[12.5px] text-muted">
                  {s.averageRating !== null ? `avg ${s.averageRating}/5 · ` : ''}
                  {s.ideas} written idea{s.ideas === 1 ? '' : 's'}
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
              <select
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as FeedbackKind | '');
                  setPage(1);
                }}
                aria-label="Feedback type"
                className="rounded-[10px] border border-line-2 bg-surface px-3 py-2 text-sm"
              >
                <option value="">All feedback</option>
                {(Object.keys(KIND) as FeedbackKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND[k].label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={withText}
                  onChange={(e) => {
                    setWithText(e.target.checked);
                    setPage(1);
                  }}
                  className="size-4 accent-[var(--brand)]"
                />
                Only written 11★ ideas and comments
              </label>
              <span className="ml-auto text-[12.5px] text-muted">{data.total} in total</span>
            </div>
            {data.items.length === 0 ? (
              <EmptyState title="No feedback yet">
                Students rate lesson steps, finished lessons, practice questions and pages. It all
                lands here.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {data.items.map((f) => (
                  <li key={f.id} className="grid gap-1.5 px-4 py-3.5 sm:px-5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Badge tone={KIND[f.kind].tone}>{KIND[f.kind].label}</Badge>
                      <b className="text-[14px]">{f.source}</b>
                      {f.rating !== null && (
                        <span className="text-[13px]" title={`${f.rating} of 5`}>
                          {FACES[f.rating - 1]} {f.rating}/5
                        </span>
                      )}
                      {f.thumbs === 'UP' && (
                        <ThumbsUp className="size-4 text-ok" aria-label="Clear" />
                      )}
                      {f.thumbs === 'DOWN' && (
                        <ThumbsDown className="size-4 text-bad" aria-label="Not clear" />
                      )}
                      <span className="ml-auto text-[12px] text-muted">
                        {f.student} · {timeAgo(f.createdAt)}
                      </span>
                    </div>
                    {f.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {f.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[12px] text-ink-2"
                          >
                            {TAG[t] ?? t}
                          </span>
                        ))}
                      </div>
                    )}
                    {f.text && (
                      <p className="flex gap-2 text-[14px] text-ink">
                        <MessageSquareQuote
                          className="mt-0.5 size-4 shrink-0 text-brand"
                          aria-hidden
                        />
                        {f.text}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {pages > 1 && (
              <div className="flex items-center justify-end gap-2 border-t border-line p-3">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-[12.5px] text-muted">
                  Page {page} of {pages}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={page >= pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function ElevenStarMap() {
  const [level, setLevel] = useState(6);
  const [, text] = STAR11[level - 1] ?? STAR11[5] ?? [6, ''];
  const mark = STAR_MARK[level];
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base">11-star map: preparing for one interview topic</h2>
        <span className="text-[12.5px] text-muted">
          Airbnb's method: design past five stars, then build the best stars you can.
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={11}
        value={level}
        onChange={(e) => setLevel(Number(e.target.value))}
        aria-label="Star level"
        className="mt-4 w-full accent-[var(--brand)]"
      />
      <div className="mt-1 grid grid-cols-11 text-center font-mono text-[11px] text-muted">
        {STAR11.map(([n]) => (
          <span key={n} className={cn(STAR_MARK[n] && 'font-bold text-brand')}>
            {n}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-start gap-3 rounded-xl bg-surface-2 px-4 py-3">
        <span
          role="img"
          className="flex shrink-0 items-center text-warn"
          aria-label={`${level} stars`}
        >
          {Array.from({ length: level }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: stars are identical and fixed in number
            <Star key={i} className="size-3.5 fill-current" aria-hidden />
          ))}
        </span>
        {/* A floor of 15rem makes the sentence take its own line instead of a one-word column. */}
        <p className="min-w-[15rem] flex-1 text-[14px]">
          <b>
            {level} star{level === 1 ? '' : 's'}.
          </b>{' '}
          {text}
        </p>
        {mark && <Badge tone={mark.tone}>{mark.label}</Badge>}
      </div>
    </Card>
  );
}
