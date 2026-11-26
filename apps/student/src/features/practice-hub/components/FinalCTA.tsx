import { ArrowRight } from 'lucide-react';
import { useReveal } from '../lib/hooks';

export function FinalCTA({ onExplore }: { onExplore: () => void }) {
  const ref = useReveal<HTMLElement>();
  return (
    <section ref={ref} className="reveal mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
      <div className="relative isolate overflow-hidden rounded-3xl bg-[#0b1526] px-6 py-14 text-center sm:px-12 sm:py-16">
        <div className="absolute -top-24 left-1/2 -z-10 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(31_91_255/0.45),transparent)]" />
        <div className="absolute inset-0 -z-10 opacity-[0.12] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />
        <h2 className="mx-auto max-w-2xl text-[clamp(26px,3.6vw,40px)] text-white">
          Ready to Start Your AI/ML Journey?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-white/75">
          Your next step is simple. Choose a topic, open a question, and start practicing.
        </p>
        <button
          type="button"
          onClick={onExplore}
          className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-[15px] font-semibold text-[#0b1526] transition-transform hover:-translate-y-0.5"
        >
          Explore All Questions
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </button>
      </div>
    </section>
  );
}
