import { Button, cn } from '@app/ui';
import { Check, Copy, Play, TriangleAlert } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { highlightLines, type TokenKind } from './highlight';
import { python, type RunResult, usePythonState } from './python/runner';

const TOKEN_CLASS: Record<TokenKind, string> = {
  keyword: 'text-g3 font-medium',
  builtin: 'text-g0',
  string: 'text-ok',
  comment: 'text-muted italic',
  number: 'text-g1',
  def: 'text-brand font-semibold',
  deco: 'text-g4',
  plain: '',
};

export function CodeBlock({
  code,
  language = 'python',
  highlight = null,
  label,
  className,
}: {
  code: string;
  language?: string;
  /** 1-based inclusive line range to emphasise. */
  highlight?: readonly [number, number] | null;
  label?: string;
  className?: string;
}) {
  const lines = useMemo(() => highlightLines(code, language), [code, language]);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  };
  return (
    <div className={cn('overflow-hidden rounded-xl border border-line bg-surface-2', className)}>
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
        <span className="font-mono text-[11px] font-semibold tracking-wide text-muted uppercase">
          {label ?? language}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] text-muted hover:bg-surface-3 hover:text-ink"
        >
          {copied ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable regions must be keyboard-focusable (WCAG 2.1.1) */}
      <pre className="overflow-x-auto py-2.5 font-mono text-[12.5px] leading-[1.65]" tabIndex={0}>
        <code className="grid min-w-max">
          {lines.map((tokens, i) => {
            const n = i + 1;
            const on = highlight !== null && n >= highlight[0] && n <= highlight[1];
            return (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: lines are positional
                key={i}
                className={cn(
                  'grid grid-cols-[2.75rem_1fr] pr-4 transition-colors',
                  on && 'bg-brand-soft',
                  highlight && !on && 'opacity-55',
                )}
              >
                <span
                  className={cn(
                    'pr-3 text-right text-muted/70 select-none',
                    on && 'font-semibold text-brand',
                  )}
                  aria-hidden
                >
                  {n}
                </span>
                <span>
                  {tokens.length === 0
                    ? ' '
                    : tokens.map((t, j) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: tokens are positional
                        <span key={j} className={TOKEN_CLASS[t.kind]}>
                          {t.text}
                        </span>
                      ))}
                </span>
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

export function OutputPanel({
  title = 'Output',
  text,
  error,
  tone = 'neutral',
  badge,
}: {
  title?: string;
  text: string;
  error?: string | null;
  tone?: 'neutral' | 'ok' | 'bad';
  badge?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border',
        tone === 'ok' ? 'border-ok/40' : tone === 'bad' ? 'border-bad/40' : 'border-line',
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-1.5">
        <span className="font-mono text-[11px] font-semibold tracking-wide text-muted uppercase">
          {title}
        </span>
        {badge}
      </div>
      {/* Output wraps instead of scrolling, so it never needs keyboard scrolling. */}
      <pre className="bg-surface px-3 py-2.5 font-mono text-[12.5px] leading-[1.6] break-words whitespace-pre-wrap text-ink">
        {text || (!error ? <span className="text-muted">(no output)</span> : null)}
        {error && (
          <span className="mt-1 block text-bad">
            <TriangleAlert className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
            {error}
          </span>
        )}
      </pre>
    </div>
  );
}

/** Runs code with the shared Python runtime and keeps the latest result. */
export function useRunner() {
  const state = usePythonState();
  const [result, setResult] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (code: string, packages: string[] = []) => {
    setBusy(true);
    try {
      const r = await python.run(code, packages);
      setResult(r);
      return r;
    } finally {
      setBusy(false);
    }
  };
  return { state, result, busy, run, clear: () => setResult(null) };
}

export function RunButton({
  onClick,
  busy,
  state,
  label = 'Run',
  variant = 'dark',
}: {
  onClick: () => void;
  busy: boolean;
  state: ReturnType<typeof usePythonState>;
  label?: string;
  variant?: 'dark' | 'secondary' | 'primary';
}) {
  const text = !busy
    ? label
    : state === 'starting' || state === 'idle'
      ? 'Starting Python…'
      : 'Running…';
  return (
    <Button type="button" size="sm" variant={variant} onClick={onClick} loading={busy}>
      {!busy && <Play className="size-3.5" aria-hidden />}
      {text}
    </Button>
  );
}

export function RunHint({
  state,
  busy,
}: {
  state: ReturnType<typeof usePythonState>;
  busy: boolean;
}) {
  if (!busy || state !== 'starting') return null;
  return (
    <span className="text-[12px] text-muted" role="status">
      Loading Python in your browser. The first run takes a few seconds.
    </span>
  );
}
