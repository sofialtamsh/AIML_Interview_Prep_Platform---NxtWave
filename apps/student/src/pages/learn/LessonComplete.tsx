import type { CompleteLessonResponse, LessonResponse } from '@app/contracts';
import { LESSON_FEEDBACK_TAGS } from '@app/contracts';
import type { AttemptRecord } from '@app/learning-ui';
import { Badge, Button, buttonClass, Card, Chip, cn, errorMessage } from '@app/ui';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Dumbbell,
  RotateCcw,
  Sparkles,
  Target,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { formatMinutes } from '../../features/roadmap/parts';
import { api } from '../../lib/api';

const FACES = [
  { value: 1, face: '😣', label: "Didn't help" },
  { value: 2, face: '😕', label: 'Meh' },
  { value: 3, face: '😐', label: 'Okay' },
  { value: 4, face: '🙂', label: 'Good' },
  { value: 5, face: '🤩', label: 'Loved it' },
] as const;

const LESSON_TAG_LABEL: Record<(typeof LESSON_FEEDBACK_TAGS)[number], string> = {
  clear_examples: 'Clear examples',
  fun_to_explore: 'Fun to explore',
  right_depth: 'Right depth for me',
  too_long: 'Too long',
  too_hard: 'Too hard',
  too_easy: 'Too easy',
  want_more_practice: 'I want more practice',
};

export function LessonComplete({
  data,
  result,
  timeSpentSec,
  attempts,
  onReview,
}: {
  data: LessonResponse;
  result: CompleteLessonResponse;
  timeSpentSec: number;
  attempts: ReadonlyMap<string, AttemptRecord>;
  onReview: () => void;
}) {
  const graded = [...attempts.values()].filter((a) => a.result.correct !== null);
  const right = graded.filter((a) => a.result.correct).length;
  const next = result.next;
  const topicSlug = data.subtopic.topic.slug;

  return (
    <div className="mx-auto grid min-h-dvh max-w-2xl content-start gap-6 px-4 py-10 sm:py-14">
      <header className="grid justify-items-center gap-3 text-center animate-rise">
        <span className="grid size-16 place-items-center rounded-2xl bg-ok-bg text-3xl" aria-hidden>
          🎉
        </span>
        <span className="eyebrow">Lesson complete</span>
        <h1 className="text-[clamp(26px,3.4vw,36px)]">{data.lesson.title}</h1>
        <p className="max-w-md text-ink-2">
          That's one more subtopic ticked off your {data.depth.name.toLowerCase()} plan. Your
          roadmap is updated.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        <Stat
          Icon={Clock}
          label="Time"
          value={formatMinutes(Math.max(1, Math.round(timeSpentSec / 60)))}
        />
        <Stat
          Icon={CheckCircle2}
          label="Checks right"
          value={graded.length ? `${right}/${graded.length}` : '–'}
        />
        <Stat Icon={Target} label="Objectives" value={String(data.lesson.objectives.length)} />
      </div>

      {data.lesson.objectives.length > 0 && (
        <Card className="p-5">
          <h2 className="text-[15px]">You can now</h2>
          <ul className="mt-2 grid gap-1.5 text-[14px]">
            {data.lesson.objectives.map((o) => (
              <li key={o.key} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />
                {o.text}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <RateLesson
        moduleVersionId={data.lesson.moduleVersionId}
        initial={data.feedback.lessonRating}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="dotgrid flex flex-col gap-2 p-5">
          <span className="eyebrow">Next on your roadmap</span>
          {next ? (
            <>
              <h3 className="font-sans text-[16px] font-semibold tracking-normal">{next.title}</h3>
              {next.hasLesson ? (
                <Link
                  to={`/learn/${next.topicSlug}/${next.subtopicSlug}`}
                  className={cn(buttonClass('primary', 'md'), 'mt-auto w-fit')}
                >
                  Start it <ArrowRight className="size-4" aria-hidden />
                </Link>
              ) : (
                <span className="mt-auto text-[13px] text-muted">
                  Its lesson is being written. We'll have it soon.
                </span>
              )}
            </>
          ) : (
            <p className="text-[14px] text-ink-2">You've reached the end of your roadmap. 🙌</p>
          )}
        </Card>
        <Card className="flex flex-col gap-2 p-5">
          <span className="flex items-center justify-between">
            <span className="eyebrow">Practice this</span>
            <Badge tone="next">Coming soon</Badge>
          </span>
          <span className="flex items-center gap-2 font-sans text-[16px] font-semibold">
            <Dumbbell className="size-4 text-brand" aria-hidden /> Interview questions
          </span>
          <p className="text-[13px] text-ink-2">
            Questions on {data.subtopic.title.toLowerCase()} at your level arrive with the question
            bank.
          </p>
        </Card>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Link to={`/topics/${topicSlug}`} className={buttonClass('secondary', 'md')}>
          Back to {data.subtopic.topic.title}
        </Link>
        <Button variant="ghost" onClick={onReview}>
          <RotateCcw className="size-4" aria-hidden /> Review this lesson
        </Button>
      </div>
    </div>
  );
}

function Stat({ Icon, label, value }: { Icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="grid justify-items-center gap-1 rounded-2xl border border-line bg-surface px-2 py-4 text-center">
      <Icon className="size-4 text-brand" aria-hidden />
      <span className="font-display text-[20px] font-bold">{value}</span>
      <span className="text-[11.5px] text-muted">{label}</span>
    </div>
  );
}

function RateLesson({
  moduleVersionId,
  initial,
}: {
  moduleVersionId: string;
  initial: number | null;
}) {
  const [rating, setRating] = useState<number | null>(initial);
  const [tags, setTags] = useState<Array<(typeof LESSON_FEEDBACK_TAGS)[number]>>([]);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!rating) return;
    setBusy(true);
    setError(null);
    try {
      await api.post('/student/feedback', {
        target: 'LESSON',
        moduleVersionId,
        rating,
        tags,
        ...(text.trim() ? { text: text.trim() } : {}),
      });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Card className="flex items-center gap-3 p-5">
        <Sparkles className="size-5 text-brand" aria-hidden />
        <p className="text-[14px]">
          Thank you. The content team reads every note and uses it to improve lessons.
        </p>
      </Card>
    );
  }
  return (
    <Card className="grid gap-4 p-5">
      <h2 className="text-[15px]">How was this lesson?</h2>
      <fieldset className="grid grid-cols-5 gap-1.5">
        <legend className="sr-only">Rate this lesson</legend>
        {FACES.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={rating === f.value}
            aria-label={`${f.value} of 5: ${f.label}`}
            onClick={() => setRating(f.value)}
            className={cn(
              'grid justify-items-center gap-1 rounded-xl border py-2.5 transition',
              rating === f.value ? 'border-brand bg-brand-soft' : 'border-line hover:border-line-2',
            )}
          >
            <span
              className={cn('text-2xl transition', rating === f.value && 'scale-110')}
              aria-hidden
            >
              {f.face}
            </span>
            <span className="text-[11px] font-medium text-ink-2">{f.label}</span>
          </button>
        ))}
      </fieldset>
      {rating !== null && (
        <div className="grid gap-3 animate-rise">
          <div className="flex flex-wrap gap-1.5">
            {LESSON_FEEDBACK_TAGS.map((t) => (
              <Chip
                key={t}
                selected={tags.includes(t)}
                onClick={() =>
                  setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])
                }
              >
                {LESSON_TAG_LABEL[t]}
              </Chip>
            ))}
          </div>
          <label className="grid gap-1.5">
            <span className="text-[13px] font-semibold">What would make this an 11★ lesson?</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Dream big: what would make it amazing?"
              className="w-full resize-y rounded-xl border border-line-2 bg-surface px-3 py-2 text-[13.5px] outline-none focus:border-brand"
            />
          </label>
          {error && <p className="text-[12.5px] text-bad">{error}</p>}
          <Button className="w-fit" onClick={submit} loading={busy}>
            Send feedback
          </Button>
        </div>
      )}
    </Card>
  );
}
