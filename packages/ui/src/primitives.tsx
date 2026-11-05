import { X } from 'lucide-react';
import {
  type ButtonHTMLAttributes,
  forwardRef,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useId,
  useRef,
} from 'react';
import { cn } from './cn';

// ───────────────────────────── Badge ─────────────────────────────

export type BadgeTone = 'live' | 'next' | 'planned' | 'hidden' | 'neutral' | 'ok' | 'warn' | 'bad';

const BADGE: Record<BadgeTone, string> = {
  live: 'bg-ok-bg text-ok',
  next: 'bg-brand-soft text-brand',
  planned: 'bg-surface-2 text-muted',
  hidden: 'bg-bad-bg text-bad',
  neutral: 'bg-surface-2 text-ink-2',
  ok: 'bg-ok-bg text-ok',
  warn: 'bg-warn-bg text-warn',
  bad: 'bg-bad-bg text-bad',
};

export function Badge({
  tone = 'neutral',
  dot = false,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[10.5px] font-bold tracking-[0.06em] whitespace-nowrap uppercase',
        BADGE[tone],
      )}
    >
      {dot && (
        <span
          className={cn('size-1.5 rounded-full bg-current', tone === 'live' && 'animate-pulse')}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}

const AVAILABILITY_LABEL = {
  LIVE: 'Live',
  NEXT_UP: 'Next up',
  PLANNED: 'Planned',
  HIDDEN: 'Hidden',
} as const;
const AVAILABILITY_TONE: Record<keyof typeof AVAILABILITY_LABEL, BadgeTone> = {
  LIVE: 'live',
  NEXT_UP: 'next',
  PLANNED: 'planned',
  HIDDEN: 'hidden',
};

export function AvailabilityBadge({ value }: { value: keyof typeof AVAILABILITY_LABEL }) {
  return (
    <Badge tone={AVAILABILITY_TONE[value]} dot>
      {AVAILABILITY_LABEL[value]}
    </Badge>
  );
}

// ───────────────────────────── Chip (toggle) ─────────────────────────────

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function Chip({ selected = false, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition',
        selected
          ? 'border-ink bg-ink text-surface'
          : 'border-line bg-surface text-ink-2 hover:border-line-2',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ───────────────────────────── TextArea / Select ─────────────────────────────

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, hint, className, id, rows = 3, ...rest },
  ref,
) {
  const autoId = useId();
  const tid = id ?? autoId;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={tid} className="text-[13px] font-semibold">
        {label}
      </label>
      <textarea
        ref={ref}
        id={tid}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={cn(
          'w-full rounded-[10px] border bg-surface px-3.5 py-2.5 text-[14.5px] text-ink outline-none transition placeholder:text-muted focus:border-brand focus:ring-[3px] focus:ring-brand-soft',
          error ? 'border-bad' : 'border-line-2',
        )}
        {...rest}
      />
      {error ? (
        <p className="text-[13px] font-medium text-bad">{error}</p>
      ) : hint ? (
        <div className="text-[12.5px] text-muted">{hint}</div>
      ) : null}
    </div>
  );
});

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export function SelectField({ label, error, options, className, id, ...rest }: SelectFieldProps) {
  const autoId = useId();
  const sid = id ?? autoId;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={sid} className="text-[13px] font-semibold">
        {label}
      </label>
      <select
        id={sid}
        className={cn(
          'rounded-[10px] border bg-surface px-3 py-2.5 text-[14.5px] focus:border-brand focus:ring-[3px] focus:ring-brand-soft focus:outline-none',
          error ? 'border-bad' : 'border-line-2',
        )}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-[13px] font-medium text-bad">{error}</p>}
    </div>
  );
}

// ───────────────────────────── Dialog ─────────────────────────────

/**
 * Accessible modal built on the native <dialog> element: focus is trapped,
 * Esc closes it, and the page behind becomes inert.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onMouseDown={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        'm-auto max-h-[90dvh] w-[calc(100%-32px)] overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink shadow-[var(--shadow-lift)] backdrop:bg-[rgb(9_18_36/0.45)] backdrop:backdrop-blur-[3px]',
        wide ? 'max-w-3xl' : 'max-w-lg',
      )}
    >
      {open && (
        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <h2 className="text-lg">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

// ───────────────────────────── Empty state ─────────────────────────────

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 px-6 py-12 text-center">
      <p className="font-display text-base font-bold">{title}</p>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}
