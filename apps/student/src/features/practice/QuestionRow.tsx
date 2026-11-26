import type {
  Difficulty,
  PracticeFeedbackTag,
  PracticeOpenResponse,
  StudentPracticeQuestion,
  StudentPracticeResponse,
} from '@app/contracts';
import {
  Alert,
  Badge,
  type BadgeTone,
  Button,
  buttonClass,
  Chip,
  cn,
  Dialog,
  errorMessage,
} from '@app/ui';
import { useMutation } from '@tanstack/react-query';
import {
  Building2,
  CircleCheck,
  Circle as CircleIcon,
  Clock3,
  ExternalLink,
  Star,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { api, queryClient } from '../../lib/api';
import { keys } from '../../lib/queries';

export const DIFFICULTY: Record<Difficulty, { label: string; tone: BadgeTone }> = {
  EASY: { label: 'Easy', tone: 'ok' },
  MEDIUM: { label: 'Medium', tone: 'warn' },
  HARD: { label: 'Hard', tone: 'bad' },
  EXPERT: { label: 'Expert', tone: 'neutral' },
};

const FACES = [
  { value: 1, face: '😣', label: 'Bad' },
  { value: 2, face: '😕', label: 'Weak' },
  { value: 3, face: '😐', label: 'Okay' },
  { value: 4, face: '🙂', label: 'Good' },
  { value: 5, face: '🤩', label: 'Great' },
] as const;

const LOW_TAGS: Array<[PracticeFeedbackTag, string]> = [
  ['statement_unclear', 'Question not clear'],
  ['too_hard', 'Too hard for me'],
  ['too_easy', 'Too easy'],
  ['portal_problem', 'Portal problem'],
  ['tests_wrong', 'Test cases look wrong'],
];
const HIGH_TAGS: Array<[PracticeFeedbackTag, string]> = [
  ['good_practice', 'Good interview practice'],
  ['right_difficulty', 'Right difficulty'],
  ['clear_statement', 'Clear question'],
  ['lesson_helped', 'The lesson helped'],
];

/** A question changed (opened or rated): refresh the Practice tab and the topic pages. */
function patchQuestion(id: string, patch: Partial<StudentPracticeQuestion>) {
  queryClient.setQueryData<StudentPracticeResponse>(keys.practice, (old) =>
    old ? { ...old, items: old.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) } : old,
  );
  void queryClient.invalidateQueries({ queryKey: ['topic'] });
}

/**
 * One practice question: name, difficulty, tags and details, and a Solve link that opens it on
 * the NxtWave learning portal in a new tab (the click is recorded). Once opened, the student
 * can rate it (the 11★ loop).
 */
export function QuestionRow({
  q,
  n,
  showTags = true,
}: {
  q: StudentPracticeQuestion;
  /** Its number in the list (01, 02…); omitted on topic pages. */
  n?: number;
  showTags?: boolean;
}) {
  const [rating, setRating] = useState(false);
  const record = useMutation({
    mutationFn: () => api.post<PracticeOpenResponse>(`/student/practice/${q.id}/open`),
    onSuccess: (r) => patchQuestion(q.id, { openedAt: q.openedAt ?? r.openedAt }),
  });
  const d = DIFFICULTY[q.difficulty];
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-start gap-3 px-4 py-3.5 sm:px-5">
      {q.openedAt ? (
        <CircleCheck className="mt-0.5 size-5 text-ok" aria-label="Opened" />
      ) : (
        <CircleIcon className="mt-0.5 size-5 text-line-2" aria-label="Not opened yet" />
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          {n !== undefined && (
            <span className="font-mono text-[12px] text-muted">{String(n).padStart(2, '0')}</span>
          )}
          <b className="text-[14.5px] font-semibold">{q.title}</b>
        </div>
        {q.description && <p className="mt-0.5 text-[13px] text-ink-2">{q.description}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-muted">
          <Badge tone={d.tone}>{d.label}</Badge>
          {q.skill && <span>{q.skill}</span>}
          {q.estimatedMinutes && (
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3" aria-hidden /> {q.estimatedMinutes} min
            </span>
          )}
          {q.askedAt.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3" aria-hidden /> Asked at {q.askedAt.join(', ')}
            </span>
          )}
        </div>
        {showTags && q.tags.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Topics">
            {q.tags.map((t) => (
              <li key={`${t.topicSlug}/${t.subtopicSlug ?? ''}`}>
                <Link
                  to={`/topics/${t.topicSlug}`}
                  className="inline-block rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[12px] text-ink-2 hover:border-brand/40 hover:text-brand"
                >
                  {t.subtopicTitle ?? t.topicTitle}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {q.openedAt && (
          <button
            type="button"
            onClick={() => setRating(true)}
            className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand hover:underline"
          >
            <Star className="size-3.5" aria-hidden />
            {q.myRating
              ? `You rated it ${FACES[q.myRating - 1]?.face} · Edit`
              : 'Rate this question'}
          </button>
        )}
      </div>
      <a
        href={q.solveUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => record.mutate()}
        onAuxClick={(e) => e.button === 1 && record.mutate()}
        aria-label={`Solve ${q.title} on the NxtWave learning portal (opens in a new tab)`}
        className={cn(buttonClass(q.openedAt ? 'secondary' : 'primary', 'sm'))}
      >
        Solve <ExternalLink className="size-3.5" aria-hidden />
      </a>
      {rating && <RateQuestion q={q} onClose={() => setRating(false)} />}
    </li>
  );
}

/** "How was this question?" → tags → "What would make this an 11★ question?" */
function RateQuestion({ q, onClose }: { q: StudentPracticeQuestion; onClose: () => void }) {
  const [value, setValue] = useState<number | null>(q.myRating);
  const [tags, setTags] = useState<PracticeFeedbackTag[]>([]);
  const [text, setText] = useState('');
  const send = useMutation({
    mutationFn: () =>
      api.post(`/student/practice/${q.id}/feedback`, {
        rating: value,
        tags,
        ...(text.trim() ? { text: text.trim() } : {}),
      }),
    onSuccess: () => patchQuestion(q.id, { myRating: value }),
  });
  const choices = value !== null && value <= 3 ? LOW_TAGS : HIGH_TAGS;

  return (
    <Dialog open onClose={onClose} title="How was this question?">
      {send.isSuccess ? (
        <div className="grid gap-4 text-center">
          <p className="text-[15px]">Thanks! Your feedback goes straight to the content team. 🙌</p>
          <Button onClick={onClose}>Done</Button>
        </div>
      ) : (
        <div className="grid gap-5">
          <p className="text-[13.5px] text-ink-2">{q.title}</p>
          <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Your rating">
            {FACES.map((f) => (
              // biome-ignore lint/a11y/useSemanticElements: a face button cannot be a native radio input
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={value === f.value}
                onClick={() => {
                  if ((value ?? 0) <= 3 !== f.value <= 3) setTags([]);
                  setValue(f.value);
                }}
                className={cn(
                  'grid justify-items-center gap-1 rounded-xl border-[1.5px] px-1 py-2.5 transition',
                  value === f.value
                    ? 'border-brand bg-brand-soft'
                    : 'border-line hover:border-line-2',
                )}
              >
                <span
                  className={cn('text-2xl transition', value === f.value && 'scale-110')}
                  aria-hidden
                >
                  {f.face}
                </span>
                <span className="text-[11px] font-medium text-ink-2">{f.label}</span>
              </button>
            ))}
          </div>
          {value !== null && (
            <>
              <div className="flex flex-wrap gap-2">
                {choices.map(([tag, label]) => (
                  <Chip
                    key={tag}
                    selected={tags.includes(tag)}
                    onClick={() =>
                      setTags(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag])
                    }
                  >
                    {label}
                  </Chip>
                ))}
              </div>
              <label className="grid gap-1.5">
                <span className="text-[13px] font-semibold">
                  What would make this an 11★ question?
                </span>
                <span className="text-[12.5px] text-muted">
                  Think past 5 stars. No idea is too big.
                </span>
                <textarea
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={2000}
                  placeholder={
                    value <= 3
                      ? 'Tell us what went wrong and what you expected.'
                      : 'For example: show a hint when my code fails a test.'
                  }
                  className="w-full rounded-[10px] border border-line-2 bg-surface px-3.5 py-2.5 text-[14.5px] outline-none focus:border-brand focus:ring-[3px] focus:ring-brand-soft"
                />
              </label>
            </>
          )}
          {send.isError && <Alert tone="bad">{errorMessage(send.error)}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={value === null}
              loading={send.isPending}
              onClick={() => send.mutate()}
            >
              Send feedback
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
