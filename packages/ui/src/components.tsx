import { AlertCircle, CheckCircle2, Eye, EyeOff, Info, Loader2, TriangleAlert } from 'lucide-react';
import {
  type ButtonHTMLAttributes,
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  useId,
  useState,
} from 'react';
import { cn } from './cn';

// ───────────────────────────── Button ─────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-brand-ink border-brand shadow-[0_6px_16px_-6px_color-mix(in_srgb,var(--brand)_70%,transparent)] hover:brightness-110',
  secondary: 'bg-surface text-ink border-line-2 hover:border-ink-2',
  ghost: 'bg-transparent text-ink-2 border-transparent hover:bg-surface-2',
  dark: 'bg-ink text-surface border-ink hover:opacity-90',
  danger: 'bg-bad text-white border-bad hover:brightness-110',
};
const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[13px] rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-[10px]',
  lg: 'px-5 py-3 text-[15px] rounded-xl',
};

/** Button styling for elements that must stay links (navigation), so links never wrap buttons. */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return cn(
    'inline-flex items-center justify-center gap-2 border font-semibold whitespace-nowrap transition active:translate-y-px',
    VARIANTS[variant],
    SIZES[size],
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    block = false,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 border font-semibold whitespace-nowrap transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        block && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

// ───────────────────────────── Text field ─────────────────────────────

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, className, type = 'text', id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [reveal, setReveal] = useState(false);
  const isPassword = type === 'password';
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={inputId} className="text-[13px] font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={isPassword && reveal ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full rounded-[10px] border bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted outline-none transition',
            'focus:border-brand focus:ring-[3px] focus:ring-brand-soft',
            error ? 'border-bad' : 'border-line-2',
            isPassword && 'pr-11',
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-ink"
            aria-label={reveal ? 'Hide password' : 'Show password'}
          >
            {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-[13px] font-medium text-bad">
          {error}
        </p>
      ) : hint ? (
        <div id={`${inputId}-hint`} className="text-[12.5px] text-muted">
          {hint}
        </div>
      ) : null}
    </div>
  );
});

// ───────────────────────────── Card / Alert / misc ─────────────────────────────

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-[var(--radius-card)] border border-line bg-surface', className)}
      {...rest}
    />
  );
}

type Tone = 'info' | 'ok' | 'bad' | 'warn';
const TONES: Record<Tone, { cls: string; Icon: typeof Info }> = {
  info: { cls: 'bg-brand-soft text-brand-deep', Icon: Info },
  ok: { cls: 'bg-ok-bg text-ok', Icon: CheckCircle2 },
  bad: { cls: 'bg-bad-bg text-bad', Icon: AlertCircle },
  warn: { cls: 'bg-warn-bg text-warn', Icon: TriangleAlert },
};

export function Alert({
  tone = 'info',
  children,
  action,
}: {
  tone?: Tone;
  children: ReactNode;
  action?: ReactNode;
}) {
  const { cls, Icon } = TONES[tone];
  return (
    <div
      role={tone === 'bad' ? 'alert' : 'status'}
      className={cn(
        'flex flex-wrap items-start gap-3 rounded-[10px] px-3.5 py-3 text-sm font-medium',
        cls,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-muted">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function FullPageSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Spinner />
    </div>
  );
}

export function Logo({ subtitle }: { subtitle?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-[30px] place-items-center rounded-lg bg-brand font-display text-sm font-extrabold text-brand-ink">
        N
      </span>
      <span className="font-display text-[15px] leading-tight font-extrabold tracking-tight">
        NxtWave
        {subtitle && (
          <small className="block font-mono text-[10px] font-medium tracking-[0.06em] text-muted uppercase">
            {subtitle}
          </small>
        )}
      </span>
    </span>
  );
}

/** Gentle, honest feedback on password strength (length matters most). */
export function passwordScore(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length < 8) return 0;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (pw.length >= 14 || (pw.length >= 11 && variety >= 3)) return 3;
  if (pw.length >= 10 || variety >= 3) return 2;
  return 1;
}

export function PasswordMeter({ password }: { password: string }) {
  const score = passwordScore(password);
  const labels = ['Too short', 'Okay', 'Good', 'Strong 💪'];
  const colors = ['bg-bad', 'bg-warn', 'bg-g2', 'bg-ok'];
  return (
    <span className="flex items-center gap-2">
      <span className="flex flex-1 gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              password && score > i ? colors[score] : 'bg-surface-3',
            )}
          />
        ))}
      </span>
      <span className="font-mono text-[11.5px]">{password ? labels[score] : '8+ characters'}</span>
    </span>
  );
}
