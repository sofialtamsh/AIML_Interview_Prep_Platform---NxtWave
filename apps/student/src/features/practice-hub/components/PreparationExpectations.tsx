import { CalendarCheck, Flame, Users } from 'lucide-react';
import { useReveal } from '../lib/hooks';

/** A suggested rhythm, worked out from the real number of questions. Not a tracker. */
export function PreparationExpectations({ total }: { total: number }) {
  const ref = useReveal<HTMLElement>();
  const fastest = Math.max(1, Math.ceil(total / 3));
  const steady = Math.max(1, Math.ceil(total / 2));
  // Two weeks of days: the dots show 2 or 3 questions a day, as an illustration.
  const days = Array.from({ length: 14 }, (_, i) => (i % 3 === 2 ? 3 : 2));

  return (
    <section ref={ref} className="reveal mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <span className="eyebrow text-brand">Your daily rhythm</span>
          <h2 className="mt-3 text-[clamp(26px,3.4vw,38px)]">
            Small Daily Progress. Strong Interview Preparation.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-2">
            You don't need to solve everything in one day. Aim to practice{' '}
            <b className="text-ink">2–3 questions daily</b> and keep improving across the different
            AI/ML domains.
          </p>
          <ul className="mt-6 grid gap-3">
            <li className="flex gap-3 rounded-xl border border-line bg-surface p-4">
              <CalendarCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
              <span className="text-[14.5px] text-ink-2">
                At that pace, all <b className="text-ink">{total} questions</b> take about{' '}
                <b className="text-ink">
                  {fastest}–{steady} days
                </b>
                . A suggested target, not a deadline.
              </span>
            </li>
            <li className="flex gap-3 rounded-xl border border-line bg-surface p-4">
              <Users className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
              <span className="text-[14.5px] text-ink-2">
                Interactive sessions and guided discussions are also part of the program, so you can
                talk through the questions with mentors.
              </span>
            </li>
          </ul>
        </div>

        <figure className="rounded-3xl border border-line bg-surface p-5 shadow-soft sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <figcaption className="eyebrow">A two-week rhythm</figcaption>
            <span className="inline-flex items-center gap-1 rounded-full bg-warn-bg px-2 py-0.5 font-mono text-[11px] font-semibold text-warn">
              <Flame className="size-3.5" aria-hidden /> 2–3 a day
            </span>
          </div>
          <ol
            className="mt-5 grid grid-cols-7 gap-2"
            aria-label="Illustration: two to three questions on each of fourteen days"
          >
            {days.map((n, i) => (
              <li
                // biome-ignore lint/suspicious/noArrayIndexKey: days are positional
                key={i}
                className="grid aspect-square content-center justify-items-center gap-1 rounded-xl border border-line bg-surface-2"
              >
                <span className="font-mono text-[10px] text-muted">D{i + 1}</span>
                <span className="flex gap-0.5" aria-hidden>
                  {Array.from({ length: n }, (_, j) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: dots are identical
                    <span key={j} className="size-1.5 rounded-full bg-brand" />
                  ))}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[12.5px] text-muted">
            An illustration of the suggested pace. Nothing here tracks you.
          </p>
        </figure>
      </div>
    </section>
  );
}
