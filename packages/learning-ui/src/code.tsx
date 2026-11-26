/**
 * The coding-ground look: every code surface in a lesson renders like a real editor and
 * terminal (dark, line numbers, syntax colours, a green Run button), whatever the page theme,
 * so code always looks and feels like code.
 */
import { cn } from '@app/ui';
import { Check, Copy, FileCode2, Loader2, Play, TerminalSquare, TriangleAlert } from 'lucide-react';
import { type KeyboardEvent, type ReactNode, type UIEvent, useMemo, useRef, useState } from 'react';
import { highlightLines, type Token, type TokenKind } from './highlight';
import { python, type RunResult, usePythonState } from './python/runner';

/** Night-theme syntax colours (readable on the dark editor in both page themes). */
const TOKEN_CLASS: Record<TokenKind, string> = {
  keyword: 'text-[#c792ea]',
  builtin: 'text-[#82aaff]',
  string: 'text-[#c3e88d]',
  comment: 'text-[#6b7f99] italic',
  number: 'text-[#f78c6c]',
  def: 'text-[#ffcb6b]',
  deco: 'text-[#7fdbca]',
  plain: '',
};

const Tokens = ({ tokens }: { tokens: Token[] }) =>
  tokens.length === 0
    ? ' '
    : tokens.map((t, j) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: tokens are positional
        <span key={j} className={TOKEN_CLASS[t.kind]}>
          {t.text}
        </span>
      ));

// ───────────── Window ─────────────

export function IdeWindow({
  filename = 'main.py',
  actions,
  children,
  className,
}: {
  filename?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-[#1f2a3d] bg-[#0f1623] text-[#d6deeb] shadow-[0_12px_32px_-16px_rgb(2_6_23/0.6)]',
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-[#1f2a3d] bg-[#0b111c] pr-2 pl-3">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="-mb-px flex items-center gap-1.5 border-x border-t border-[#1f2a3d] border-b-[#0f1623] bg-[#0f1623] px-3 py-1.5 font-mono text-[11.5px] text-[#d6deeb]">
          <FileCode2 className="size-3.5 text-[#ffcb6b]" aria-hidden />
          {filename}
        </span>
        <span className="ml-auto flex items-center gap-1">{actions}</span>
      </div>
      {children}
    </div>
  );
}

export function IdeAction({
  onClick,
  children,
  label,
  disabled,
}: {
  onClick: () => void;
  children: ReactNode;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium text-[#8a9bb5] transition-colors hover:bg-[#1a2436] hover:text-[#e6edf3] disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function CopyAction({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <IdeAction
      label="Copy the code"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked: nothing to do */
        }
      }}
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      {copied ? 'Copied' : 'Copy'}
    </IdeAction>
  );
}

// ───────────── Read-only code ─────────────

export function CodeBlock({
  code,
  language = 'python',
  highlight = null,
  label,
  className,
  actions,
}: {
  code: string;
  language?: string;
  /** 1-based inclusive line range to emphasise. */
  highlight?: readonly [number, number] | null;
  /** Shown as the file name in the editor tab. */
  label?: string;
  className?: string;
  actions?: ReactNode;
}) {
  const lines = useMemo(() => highlightLines(code, language), [code, language]);
  const filename = label && /\.\w+$/.test(label) ? label : label ? `${label}` : 'main.py';
  return (
    <IdeWindow
      filename={filename}
      className={className}
      actions={
        <>
          {actions}
          <CopyAction code={code} />
        </>
      }
    >
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable regions must be keyboard-focusable (WCAG 2.1.1) */}
      <pre className="overflow-x-auto py-3 font-mono text-[12.5px] leading-[1.7]" tabIndex={0}>
        {/* On phones, long lines soft-wrap (like an IDE's word wrap) so comments aren't cut off;
            wider screens keep one line per row and scroll sideways. */}
        <code className="grid sm:min-w-max">
          {lines.map((tokens, i) => {
            const n = i + 1;
            const on = highlight !== null && n >= highlight[0] && n <= highlight[1];
            return (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: lines are positional
                key={i}
                className={cn(
                  'grid grid-cols-[3rem_minmax(0,1fr)] border-l-2 border-transparent pr-3 transition-[background-color,opacity] duration-200 sm:pr-6',
                  on && 'border-[#82aaff] bg-[#82aaff]/12',
                  highlight && !on && 'opacity-45',
                )}
              >
                <span
                  className={cn(
                    'pr-4 text-right text-[#3d4b63] select-none',
                    on && 'font-semibold text-[#82aaff]',
                  )}
                  aria-hidden
                >
                  {n}
                </span>
                <span className="max-sm:whitespace-pre-wrap max-sm:[overflow-wrap:anywhere]">
                  <Tokens tokens={tokens} />
                </span>
              </span>
            );
          })}
        </code>
      </pre>
    </IdeWindow>
  );
}

// ───────────── Terminal ─────────────

export function OutputPanel({
  title = 'Output',
  text,
  error,
  tone = 'neutral',
  badge,
  command = 'python main.py',
  ms,
}: {
  title?: string;
  text: string;
  error?: string | null;
  tone?: 'neutral' | 'ok' | 'bad';
  badge?: ReactNode;
  command?: string | null;
  ms?: number;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-[#070b12] text-[#c9d4e5]',
        tone === 'ok'
          ? 'border-[#238636]'
          : tone === 'bad'
            ? 'border-[#da3633]'
            : 'border-[#1f2a3d]',
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#1f2a3d] bg-[#0b111c] px-3 py-1.5">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-[0.08em] text-[#8a9bb5] uppercase">
          <TerminalSquare className="size-3.5" aria-hidden /> {title}
        </span>
        {badge}
      </div>
      {/* Output wraps instead of scrolling, so it never needs keyboard scrolling. */}
      <pre className="px-3.5 py-3 font-mono text-[12.5px] leading-[1.65] break-words whitespace-pre-wrap">
        {command && (
          <span className="block text-[#5b6b85]">
            <span className="text-[#3fb950]">$</span> {command}
          </span>
        )}
        {text ? (
          <span className="text-[#e6edf3]">{text}</span>
        ) : !error ? (
          <span className="text-[#5b6b85]">(no output)</span>
        ) : null}
        {error && (
          <span className="mt-1 block text-[#ff7b72]">
            <TriangleAlert className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
            {error}
          </span>
        )}
        {ms !== undefined && (
          <span
            className={cn('mt-2 block text-[11.5px]', error ? 'text-[#ff7b72]' : 'text-[#3fb950]')}
          >
            {error ? '✗ exited with an error' : '✓ finished'} in {ms} ms
          </span>
        )}
      </pre>
    </div>
  );
}

/**
 * The verdict in a terminal's title bar after a run: a tick when the output is the expected one,
 * a cross when it is not. Runnable code shows nothing before its first run (see IdleTerminal).
 */
export function RunMark({
  ok,
  yes = 'matches the expected output',
  no = 'not the expected output',
}: {
  ok: boolean;
  yes?: string;
  no?: string;
}) {
  return (
    <span
      className={cn(
        'text-right text-[11px] leading-tight font-semibold',
        ok ? 'text-[#3fb950]' : 'text-[#ffcb6b]',
      )}
    >
      {ok ? `✓ ${yes}` : `✗ ${no}`}
    </span>
  );
}

/** A terminal waiting for its first run. */
export function IdleTerminal({ hint = 'Click Run to see the output here.' }: { hint?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-dashed border-[#1f2a3d] bg-[#070b12] px-3.5 py-3 font-mono text-[12.5px] text-[#5b6b85]">
      <span className="text-[#3fb950]">$</span> {hint}
    </div>
  );
}

// ───────────── Running ─────────────

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
  variant = 'run',
  shortcut = false,
}: {
  onClick: () => void;
  busy: boolean;
  state: ReturnType<typeof usePythonState>;
  label?: string;
  /** "run" is the green IDE button; the others suit secondary placements. */
  variant?: 'run' | 'dark' | 'secondary' | 'primary';
  shortcut?: boolean;
}) {
  const text = !busy
    ? label
    : state === 'starting' || state === 'idle'
      ? 'Starting Python…'
      : 'Running…';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-[transform,background-color] active:translate-y-px disabled:cursor-wait disabled:opacity-80',
        variant === 'run' && 'bg-[#238636] text-white hover:bg-[#2ea043]',
        variant === 'dark' && 'bg-ink text-surface hover:opacity-90',
        variant === 'primary' && 'bg-brand text-brand-ink hover:opacity-90',
        variant === 'secondary' && 'border border-line-2 bg-surface text-ink hover:border-ink-2',
      )}
    >
      {busy ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Play className="size-3.5 fill-current" aria-hidden />
      )}
      {text}
      {shortcut && !busy && (
        <kbd className="ml-1 hidden rounded border border-white/25 px-1 font-mono text-[10px] font-medium opacity-80 sm:inline">
          Ctrl ↵
        </kbd>
      )}
    </button>
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

// ───────────── Editing ─────────────

/**
 * An editable code area that looks like an editor: line numbers and live syntax colours.
 * A transparent textarea sits exactly over the highlighted code, so typing stays native
 * (selection, undo, mobile keyboards) while the colours update underneath.
 */
export function CodeEditor({
  value,
  onChange,
  label,
  filename = 'main.py',
  minRows = 8,
  onRun,
  actions,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  filename?: string;
  minRows?: number;
  /** Ctrl/Cmd + Enter runs the code. */
  onRun?: () => void;
  actions?: ReactNode;
}) {
  const lines = useMemo(() => highlightLines(value, 'python'), [value]);
  const rows = Math.max(minRows, lines.length);
  const escaped = useRef(false);
  const gutter = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (onRun && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onRun();
      return;
    }
    if (e.key === 'Escape') {
      escaped.current = true;
      return;
    }
    if (e.key === 'Tab' && escaped.current) {
      escaped.current = false;
      return; // let focus move on
    }
    escaped.current = false;
    if (e.key !== 'Tab' || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: a, selectionEnd: b } = el;
    onChange(`${value.slice(0, a)}    ${value.slice(b)}`);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = a + 4;
    });
  };
  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    if (gutter.current)
      gutter.current.style.transform = `translateY(-${e.currentTarget.scrollTop}px)`;
  };

  return (
    <IdeWindow filename={filename} actions={actions}>
      <div className="grid grid-cols-[3rem_minmax(0,1fr)] font-mono text-[12.5px] leading-[1.7]">
        <div className="overflow-hidden border-r border-[#1a2436] bg-[#0b111c]" aria-hidden>
          <div ref={gutter} className="py-3 pr-3 text-right text-[#3d4b63] select-none">
            {Array.from({ length: rows }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: line numbers are positional
              <div key={i}>{i + 1}</div>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto" onScroll={onScroll}>
          <div className="grid min-w-full w-max">
            <pre
              className="pointer-events-none m-0 px-3.5 py-3 whitespace-pre [grid-area:1/1]"
              aria-hidden
            >
              {lines.map((tokens, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: lines are positional
                <div key={i}>
                  <Tokens tokens={tokens} />
                </div>
              ))}
              {Array.from({ length: rows - lines.length }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: padding lines are positional
                <div key={`pad-${i}`}> </div>
              ))}
            </pre>
            <textarea
              aria-label={label}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              wrap="off"
              rows={rows}
              className="resize-none overflow-hidden bg-transparent px-3.5 py-3 whitespace-pre text-transparent caret-[#ffcb6b] outline-none selection:bg-[#82aaff]/30 [grid-area:1/1]"
            />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[#1a2436] bg-[#0b111c] px-3 py-1 font-mono text-[10.5px] text-[#5b6b85]">
        <span>Python 3 · runs in your browser</span>
        <span className="hidden sm:inline">Tab indents · Esc then Tab leaves</span>
      </div>
    </IdeWindow>
  );
}
