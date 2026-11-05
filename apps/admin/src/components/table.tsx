import { cn } from '@app/ui';
import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';

export function Table({ children, minWidth = 720 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'border-b border-line px-4 py-3 text-left font-mono text-[11px] font-semibold tracking-wider text-muted uppercase',
        className,
      )}
      {...rest}
    />
  );
}

export function Td({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('border-b border-line px-4 py-3 align-middle', className)} {...rest} />;
}

export function PageHeader({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="mt-1.5 text-[clamp(22px,2.4vw,28px)]">{title}</h1>
        {sub && <p className="mt-1 max-w-[70ch] text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </header>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            '-mb-px border-b-2 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap',
            value === t.id
              ? 'border-brand text-ink'
              : 'border-transparent text-muted hover:text-ink',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export const tint = (c: string) => ({
  background: `color-mix(in srgb, var(--${c}) 14%, var(--surface))`,
  color: `var(--${c})`,
});

export function RoleChip({ code, color }: { code: string; color: string }) {
  return (
    <span
      className="inline-grid size-7 shrink-0 place-items-center rounded-md font-mono text-[11px] font-bold"
      style={tint(color)}
    >
      {code}
    </span>
  );
}

export function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString('en-IN');
}

export const lines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
