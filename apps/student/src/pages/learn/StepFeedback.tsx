import type { StudentSection } from '@app/content';
import { SECTION_FEEDBACK_TAGS } from '@app/contracts';
import { Button, Chip, cn, errorMessage } from '@app/ui';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../lib/api';

export const SECTION_TAG_LABEL: Record<(typeof SECTION_FEEDBACK_TAGS)[number], string> = {
  too_fast: 'Too fast',
  hard_words: 'Hard words',
  visual_unclear: "The visual didn't help",
  content_error: 'Something looks wrong',
  too_basic: 'Too basic for me',
};

type Tag = (typeof SECTION_FEEDBACK_TAGS)[number];

/** "Was this step clear?" — tied to the exact revision the student saw. */
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
  const [stage, setStage] = useState<'idle' | 'details' | 'thanks'>(initial ? 'thanks' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async (next: 'UP' | 'DOWN' | null, withDetails = false) => {
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
      setStage(next === 'DOWN' && !withDetails ? 'details' : next ? 'thanks' : 'idle');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 rounded-2xl border border-dashed border-line-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] text-ink-2">
          {stage === 'thanks'
            ? thumbs === 'UP'
              ? 'Glad it helped. Thanks!'
              : 'Thanks. The content team will look at this step.'
            : 'Was this step clear?'}
        </span>
        <div className="flex gap-1.5">
          {(['UP', 'DOWN'] as const).map((t) => {
            const on = thumbs === t;
            const Icon = t === 'UP' ? ThumbsUp : ThumbsDown;
            return (
              <button
                key={t}
                type="button"
                disabled={busy}
                aria-pressed={on}
                aria-label={t === 'UP' ? 'Yes, it was clear' : 'No, it was not clear'}
                onClick={() => send(on ? null : t)}
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
        </div>
      </div>
      {stage === 'details' && (
        <div className="grid gap-3 animate-rise">
          <span className="text-[13px] font-semibold">What got in the way?</span>
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
            rows={2}
            maxLength={2000}
            placeholder="Anything else? (optional)"
            aria-label="More details (optional)"
            className="w-full resize-y rounded-xl border border-line-2 bg-surface px-3 py-2 text-[13.5px] outline-none focus:border-brand"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="dark" loading={busy} onClick={() => send('DOWN', true)}>
              Send
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStage('thanks')}>
              Skip
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-[12.5px] text-bad">{error}</p>}
    </div>
  );
}
