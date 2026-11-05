import type { StudentSection } from '@app/content';
import { cn } from '@app/ui';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { type KeyboardEvent, type PointerEvent, useRef, useState } from 'react';
import { Rich } from '../rich';

type Card = Extract<StudentSection, { kind: 'CARD_DECK' }>['body']['cards'][number];

/** Soft tints from the shared palette, one per card, so each story card feels distinct. */
const TINTS = ['var(--g0)', 'var(--g2)', 'var(--g3)', 'var(--g1)', 'var(--g4)'];
const SWIPE_PX = 56;

/**
 * Story cards: one idea per card, swiped like a reel. Works with touch and mouse drags, the
 * arrow keys and the buttons; screen readers get each card's position and full text.
 */
export function SwipeCards({ cards }: { cards: Card[] }) {
  const [i, setI] = useState(0);
  const [dx, setDx] = useState(0);
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]));
  const [direction, setDirection] = useState<1 | -1>(1);
  const start = useRef<number | null>(null);
  const card = cards[i] as Card;
  const last = cards.length - 1;

  const go = (next: number) => {
    const n = Math.max(0, Math.min(last, next));
    if (n === i) return;
    setDirection(n > i ? 1 : -1);
    setI(n);
    setSeen((s) => new Set(s).add(n));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    start.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current !== null) setDx(e.clientX - start.current);
  };
  const onPointerUp = () => {
    if (start.current === null) return;
    if (dx <= -SWIPE_PX) go(i + 1);
    else if (dx >= SWIPE_PX) go(i - 1);
    start.current = null;
    setDx(0);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(i + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(i - 1);
    }
  };

  const tint = TINTS[i % TINTS.length] as string;
  return (
    <div className="mx-auto grid w-full max-w-md gap-3">
      <div className="flex gap-1" aria-hidden>
        {cards.map((c, n) => (
          <span key={c.title} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
            <span
              className={cn(
                'block h-full rounded-full bg-brand transition-all duration-300',
                n <= i ? 'w-full' : 'w-0',
              )}
            />
          </span>
        ))}
      </div>

      <section
        aria-roledescription="carousel"
        aria-label={`Story cards: ${cards.length} ideas`}
        className="relative"
      >
        <span className="sr-only" aria-live="polite">
          Card {i + 1} of {cards.length}: {card.title}
        </span>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: drag surface; buttons and arrow keys do the same */}
        <div
          key={i}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: focusable so the arrow keys move between cards
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            transform: `translateX(${dx}px) rotate(${dx / 28}deg)`,
            background: `linear-gradient(160deg, color-mix(in srgb, ${tint} 16%, var(--surface)) 0%, var(--surface) 70%)`,
            borderColor: `color-mix(in srgb, ${tint} 35%, var(--line))`,
          }}
          className={cn(
            'grid min-h-[17rem] cursor-grab touch-pan-y content-start gap-3 rounded-[22px] border p-6 shadow-lift select-none active:cursor-grabbing sm:min-h-[19rem] sm:p-7',
            dx === 0 && 'transition-transform duration-300',
            direction === 1
              ? 'animate-[swipe-in-right_0.35s_ease-out]'
              : 'animate-[swipe-in-left_0.35s_ease-out]',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-[44px] leading-none" aria-hidden>
              {card.emoji ?? '💡'}
            </span>
            {card.tag && (
              <span
                className="rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-bold tracking-wide uppercase"
                style={{ background: `color-mix(in srgb, ${tint} 18%, transparent)`, color: tint }}
              >
                {card.tag}
              </span>
            )}
          </div>
          <h4 className="font-display text-[22px] leading-tight font-bold tracking-tight text-ink">
            {card.title}
          </h4>
          <Rich text={card.front} className="text-[16px] leading-relaxed text-ink" />
          {card.back && (
            <Rich text={card.back} className="border-t border-line pt-3 text-[14px] text-ink-2" />
          )}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(i - 1)}
          disabled={i === 0}
          aria-label="Previous card"
          className="grid size-10 place-items-center rounded-full border border-line-2 bg-surface text-ink-2 transition hover:border-ink-2 disabled:opacity-30"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <span className="text-[12.5px] text-muted">
          {seen.size === cards.length ? (
            <span className="inline-flex items-center gap-1 font-medium text-ok">
              <Sparkles className="size-3.5" aria-hidden /> All {cards.length} seen
            </span>
          ) : i === 0 ? (
            'Swipe or tap the arrows →'
          ) : (
            `${i + 1} / ${cards.length}`
          )}
        </span>
        <button
          type="button"
          onClick={() => go(i + 1)}
          disabled={i === last}
          aria-label="Next card"
          className="grid size-10 place-items-center rounded-full bg-ink text-surface transition hover:opacity-90 disabled:opacity-30"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
