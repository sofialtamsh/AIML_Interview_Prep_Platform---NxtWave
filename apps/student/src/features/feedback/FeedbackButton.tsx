import { PAGE_FEEDBACK_TAGS } from '@app/contracts';
import { Alert, Button, Chip, Dialog, errorMessage } from '@app/ui';
import { MessageSquareHeart } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router';
import { api } from '../../lib/api';

const LABEL: Record<(typeof PAGE_FEEDBACK_TAGS)[number], string> = {
  idea: '💡 Idea',
  bug: '🐞 Something broke',
  confusing: '🤔 Confusing',
  praise: '💙 Love it',
};

/** The floating "Feedback" button on every page (the 11★ loop). */
export function FeedbackButton() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<Array<(typeof PAGE_FEEDBACK_TAGS)[number]>>([]);
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    if (state === 'sent') {
      setState('idle');
      setTags([]);
      setText('');
    }
  };
  const send = async () => {
    setState('busy');
    setError(null);
    try {
      await api.post('/student/feedback', {
        target: 'PAGE',
        page: pathname,
        tags,
        text: text.trim(),
      });
      setState('sent');
    } catch (err) {
      setError(errorMessage(err));
      setState('idle');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className="fixed right-3 bottom-20 z-20 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface p-2.5 text-[12.5px] font-semibold text-ink-2 shadow-lift transition hover:text-ink sm:right-4 sm:bottom-5 sm:px-3.5 sm:py-2"
      >
        <MessageSquareHeart className="size-4 text-brand" aria-hidden />
        <span className="hidden sm:inline">Feedback</span>
      </button>
      <Dialog open={open} onClose={close} title="Tell us what you think">
        {state === 'sent' ? (
          <div className="grid gap-4">
            <Alert tone="ok">Thank you! We read every note.</Alert>
            <Button variant="secondary" onClick={close}>
              Close
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            <p className="text-[13.5px] text-ink-2">
              What would make this an 11★ experience? Ideas, bugs and confusing bits all help.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PAGE_FEEDBACK_TAGS.map((t) => (
                <Chip
                  key={t}
                  selected={tags.includes(t)}
                  onClick={() =>
                    setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])
                  }
                >
                  {LABEL[t]}
                </Chip>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={2000}
              aria-label="Your feedback"
              placeholder="Tell us a little more…"
              className="w-full resize-y rounded-xl border border-line-2 bg-surface px-3 py-2 text-[14px] outline-none focus:border-brand"
            />
            {error && <Alert tone="bad">{error}</Alert>}
            <Button onClick={send} loading={state === 'busy'} disabled={text.trim().length < 3}>
              Send feedback
            </Button>
          </div>
        )}
      </Dialog>
    </>
  );
}
