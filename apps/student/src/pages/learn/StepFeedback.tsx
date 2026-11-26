import type { StudentSection } from '@app/content';
import { SECTION_FEEDBACK_TAGS } from '@app/contracts';
import { Button, Chip, cn, errorMessage } from '@app/ui';
import { MessageSquareText, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';

export const SECTION_TAG_LABEL: Record<(typeof SECTION_FEEDBACK_TAGS)[number], string> = {
  too_fast: 'Too fast',
  hard_words: 'Hard words',
  visual_unclear: "The visual didn't help",
  content_error: 'Something looks wrong',
  too_basic: 'Too basic for me',
};

type Tag = (typeof SECTION_FEEDBACK_TAGS)[number];

/**
 * "Was this step clear?" in the lesson's step bar, so it is in view on every step without
 * scrolling. A thumb saves at once; a thumbs-down or the comment button opens a small panel for
 * what got in the way and a note in the student's own words. Everything is tied to the exact
 * revision the student saw, and lands in Admin → Feedback.
 */
export function StepFeedback({
  moduleVersionId,
  section,
  initial,
}: {
  moduleVersionId: string;
  section: StudentSection;
  initial: 'UP' | 'DOWN' | null;
}) {
  const [thumbs, setThumbs] = useState(initial);
  const [tags, setTags] = useState<Tag[]>([]);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // The panel closes on Escape or a click outside it, like any popover.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  const post = async (next: 'UP' | 'DOWN' | null, withDetails: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/student/feedback', {
        target: 'SECTION',
        moduleVersionId,
        sectionKey: section.key,
        revisionId: section.revisionId,
        thumbs: next,
        tags: withDetails ? tags : [],
        ...(withDetails && text.trim() ? { text: text.trim() } : {}),
      });
      setThumbs(next);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const pick = async (t: 'UP' | 'DOWN') => {
    const next = thumbs === t ? null : t;
    setSent(false);
    if ((await post(next, false)) && next === 'DOWN') setOpen(true);
  };
  const sendDetails = async () => {
    if (await post(thumbs, true)) {
      setSent(true);
      setOpen(false);
    }
  };

  const label = sent
    ? 'Thanks. The content team reads every note.'
    : thumbs === 'UP'
      ? 'Glad it helped. Thanks!'
      : thumbs === 'DOWN'
        ? 'Thanks. We will look at this step.'
        : 'Was this step clear?';

  return (
    <div ref={box} className="relative flex min-w-0 items-center gap-2">
      <span className="hidden min-w-0 truncate text-[12.5px] text-ink-2 lg:inline">{label}</span>
      <div className="flex shrink-0 gap-1">
        {(['UP', 'DOWN'] as const).map((t) => {
          const on = thumbs === t;
          const Icon = t === 'UP' ? ThumbsUp : ThumbsDown;
          return (
            <button
              key={t}
              type="button"
              disabled={busy}
              aria-pressed={on}
              aria-label={t === 'UP' ? 'Yes, this step was clear' : 'No, this step was not clear'}
              title={t === 'UP' ? 'This step was clear' : 'This step was not clear'}
              onClick={() => pick(t)}
              className={cn(
                'grid size-9 place-items-center rounded-lg border transition',
                on
                  ? t === 'UP'
                    ? 'border-ok bg-ok-bg text-ok'
                    : 'border-bad bg-bad-bg text-bad'
                  : 'border-line text-muted hover:border-line-2 hover:text-ink',
              )}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          );
        })}
        <button
          type="button"
          aria-expanded={open}
          aria-label="Write a comment about this step"
          title="Write a comment about this step"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'grid size-9 place-items-center rounded-lg border transition',
            open
              ? 'border-brand bg-brand-soft text-brand'
              : 'border-line text-muted hover:border-line-2 hover:text-ink',
          )}
        >
          <MessageSquareText className="size-4" aria-hidden />
        </button>
      </div>
      {error && !open && <span className="text-[12px] text-bad">{error}</span>}

      {open && (
        <div
          role="dialog"
          aria-label="Feedback on this step"
          className="absolute bottom-[calc(100%+0.75rem)] left-0 z-30 grid w-[min(22rem,calc(100vw-2rem))] gap-3 rounded-2xl border border-line bg-surface p-4 shadow-lift animate-rise"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-[13.5px] font-semibold text-ink">
              {thumbs === 'DOWN' ? 'What got in the way?' : 'Tell us about this step'}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-m-1 grid size-7 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SECTION_FEEDBACK_TAGS.map((t) => (
              <Chip
                key={t}
                selected={tags.includes(t)}
                onClick={() =>
                  setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])
                }
              >
                {SECTION_TAG_LABEL[t]}
              </Chip>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="What was confusing, missing or wrong? What would make it better?"
            aria-label="Your comment"
            className="w-full resize-y rounded-xl border border-line-2 bg-surface px-3 py-2 text-[13.5px] outline-none focus:border-brand"
          />
          {error && <p className="text-[12.5px] text-bad">{error}</p>}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="dark"
              loading={busy}
              disabled={!text.trim() && tags.length === 0}
              onClick={sendDetails}
            >
              Send
            </Button>
            <span className="text-[12px] text-muted">Goes to the content team.</span>
          </div>
        </div>
      )}
    </div>
  );
}
