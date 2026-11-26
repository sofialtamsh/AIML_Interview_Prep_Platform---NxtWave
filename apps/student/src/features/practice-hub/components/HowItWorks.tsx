import { CirclePlay, CodeXml, Compass } from 'lucide-react';
import { useReveal } from '../lib/hooks';
import { SectionHeading } from './SectionHeading';

const STEPS = [
  {
    Icon: Compass,
    title: 'Explore',
    body: 'Browse coding questions organized by subject and course. Filter by subject or level to find your next one.',
  },
  {
    Icon: CodeXml,
    title: 'Practice',
    body: 'Click "Solve Question" and practice directly on NxtWave Academy, in the same place as your courses.',
  },
  {
    Icon: CirclePlay,
    title: 'Strengthen your concepts',
    body: 'Stuck? Open "Watch concept" to revisit the learning video for that topic, then try again.',
  },
];

export function HowItWorks() {
  const ref = useReveal<HTMLElement>();
  return (
    <section id="how" ref={ref} className="reveal border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeading eyebrow="How it works" title="Three steps, every day" align="center">
          No new platform to learn. This page finds the right question; Academy is where you solve
          it.
        </SectionHeading>
        <ol className="relative mt-12 grid gap-6 md:grid-cols-3 md:gap-8">
          <span
            className="absolute top-7 right-[16%] left-[16%] hidden h-px bg-[repeating-linear-gradient(90deg,var(--line-2)_0_6px,transparent_6px_12px)] md:block"
            aria-hidden
          />
          {STEPS.map(({ Icon, title, body }, i) => (
            <li key={title} className="relative grid justify-items-center gap-3 text-center">
              <span className="relative grid size-14 place-items-center rounded-2xl border border-line bg-bg text-brand shadow-soft">
                <Icon className="size-6" aria-hidden />
                <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-ink font-mono text-[11px] font-bold text-surface">
                  {i + 1}
                </span>
              </span>
              <h3 className="font-sans text-[18px] font-bold tracking-tight">
                Step {i + 1} – {title}
              </h3>
              <p className="max-w-xs text-[14.5px] leading-relaxed text-ink-2">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
