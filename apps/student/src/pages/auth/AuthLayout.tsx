import { Logo } from '@app/ui';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { SELF_PACED } from '../../lib/features';

// The three roles the platform prepares for, in the same order as the Practice tab's role tabs.
// Machine learning is asked in all three interviews, so ML Engineer opens first.
const ROLES = [
  {
    code: 'MLE',
    name: 'ML Engineer',
    focus: 'Algorithms, model evaluation, ML coding',
    open: true,
  },
  { code: 'AIE', name: 'AI Engineer', focus: 'ML basics, then LLMs, RAG and agents', open: false },
  {
    code: 'DS',
    name: 'Data Scientist',
    focus: 'ML basics, then statistics and experiments',
    open: false,
  },
] as const;

const STEPS = SELF_PACED
  ? ([
      ['01', 'Learn one algorithm at a time', 'Explained simply, then worked out in a live lab'],
      [
        '02',
        'Answer the way interviewers expect',
        'A short quiz and the interview questions for every unit',
      ],
      ['03', 'Practise', 'Real coding questions on NxtWave Academy'],
    ] as const)
  : ([
      ['01', 'Pick your role', 'ML Engineer is open now, more roles soon'],
      ['02', 'Get your roadmap', 'A day-by-day plan with a clear daily target'],
      ['03', 'Learn, then practise', 'Interactive lessons + real interview questions'],
    ] as const);

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
      <aside className="dotgrid relative hidden flex-col justify-between gap-8 border-r border-line px-10 py-10 [@media(max-height:820px)]:gap-6 [@media(max-height:820px)]:py-7 lg:flex">
        <Link to="/" className="w-fit">
          <Logo subtitle="Interview Prep" />
        </Link>
        <div className="max-w-xl animate-rise">
          <div className="eyebrow mb-3">ML Engineer · AI Engineer · Data Scientist</div>
          <h1 className="text-[clamp(30px,3.2vw,44px)]">
            Get ready for <em className="text-brand not-italic">ML, AI and data science</em>{' '}
            interviews.
          </h1>
          <p className="mt-4 max-w-[48ch] text-base text-ink-2">
            {SELF_PACED
              ? 'All three interviews test machine learning, so that is where we start. Learn each algorithm the way interviewers ask about it, at your own pace, then practise real questions.'
              : 'A clear daily plan from your mentors, lessons at exactly the depth you need, and real interview questions to practise.'}
          </p>
          <ol className="mt-7 grid gap-2.5 [@media(max-height:820px)]:mt-5">
            {STEPS.map(([n, t, d]) => (
              <li
                key={n}
                className="flex items-start gap-3 rounded-xl border border-line bg-surface/80 p-3 backdrop-blur"
              >
                <span className="font-mono text-xs font-bold text-brand">{n}</span>
                <span>
                  <b className="block text-sm">{t}</b>
                  <span className="text-[13px] text-muted [@media(max-height:820px)]:hidden">
                    {d}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <div className="eyebrow mb-2.5">Built for three roles</div>
          <ul className="grid grid-cols-3 gap-2.5">
            {ROLES.map((r) => (
              <li
                key={r.code}
                className={`rounded-xl border p-3 ${
                  r.open ? 'border-brand/40 bg-brand-soft/60' : 'border-line bg-surface/80'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <b className="font-mono text-xs text-brand">{r.code}</b>
                  <span
                    className={
                      r.open ? 'text-[11px] font-semibold text-ok' : 'text-[11px] text-muted'
                    }
                  >
                    {r.open ? 'Open now' : 'Coming soon'}
                  </span>
                </div>
                <b className="mt-1.5 block text-sm">{r.name}</b>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">
                  {r.focus}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex flex-col bg-surface px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo subtitle="Interview Prep" />
          <p className="mt-2 font-mono text-[11px] text-muted">
            ML Engineer · AI Engineer · Data Scientist
          </p>
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
