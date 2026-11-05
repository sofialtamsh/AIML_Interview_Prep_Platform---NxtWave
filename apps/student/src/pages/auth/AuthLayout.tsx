import { Logo } from '@app/ui';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

const ROLES = [
  ['AI', 'AI Engineer'],
  ['ML', 'ML Engineer'],
  ['DA', 'Data Analyst'],
  ['DS', 'Data Scientist'],
] as const;

const STEPS = [
  ['01', 'Pick your target', 'Role + the package you are aiming for'],
  ['02', 'Get your roadmap', 'Day-by-day plan that fits your hours'],
  ['03', 'Learn, then practise', 'Interactive lessons + real interview questions'],
] as const;

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="dotgrid relative hidden flex-col justify-between gap-10 border-r border-line px-10 py-11 lg:flex">
        <Link to="/" className="w-fit">
          <Logo subtitle="Interview Prep" />
        </Link>
        <div className="max-w-xl animate-rise">
          <h1 className="text-[clamp(30px,3.4vw,46px)]">
            Prep for the <em className="text-brand not-italic">AI & data job</em> you actually want.
          </h1>
          <p className="mt-4 max-w-[46ch] text-base text-ink-2">
            Pick your role and target package. Get a plan that fits your hours, lessons at exactly
            the depth you need, and real interview questions to practise.
          </p>
          <ol className="mt-8 grid gap-3">
            {STEPS.map(([n, t, d]) => (
              <li
                key={n}
                className="flex items-start gap-3 rounded-xl border border-line bg-surface/80 p-3 backdrop-blur"
              >
                <span className="font-mono text-xs font-bold text-brand">{n}</span>
                <span>
                  <b className="block text-sm">{t}</b>
                  <span className="text-[13px] text-muted">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <div className="eyebrow mb-2.5">Career paths</div>
          <div className="flex flex-wrap gap-2">
            {ROLES.map(([ic, name]) => (
              <span
                key={ic}
                className="rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-xs text-ink-2"
              >
                <b className="mr-1.5 text-brand">{ic}</b>
                {name}
              </span>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex flex-col bg-surface px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo subtitle="Interview Prep" />
        </div>
        <div className="m-auto w-full max-w-[400px] animate-rise py-8">
          <h2 className="text-2xl">{title}</h2>
          {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
