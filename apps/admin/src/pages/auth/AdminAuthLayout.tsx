import { Logo } from '@app/ui';
import { ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

export function AdminAuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="dotgrid grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[420px] animate-rise">
        <div className="mb-6 flex items-center justify-between">
          <Logo subtitle="Admin console" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 font-mono text-[11px] font-semibold text-muted">
            <ShieldCheck className="size-3.5" aria-hidden /> Staff only
          </span>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-7 shadow-[var(--shadow-soft)]">
          <h1 className="text-xl">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-5 text-center text-xs text-muted">
          Access is by invitation. Sessions end after 2 hours of inactivity.
        </p>
      </div>
    </div>
  );
}
