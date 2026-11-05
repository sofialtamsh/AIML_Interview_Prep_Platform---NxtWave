import type { StudentSection } from '@app/content';
import { Button, cn } from '@app/ui';
import {
  ArrowDown,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Lightbulb,
  Mic,
  RotateCw,
  Sparkles,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { layerNodes } from '../layout';
import { Rich } from '../rich';
import { SwipeCards } from './swipe-cards';

type Of<K extends StudentSection['kind']> = Extract<StudentSection, { kind: K }>;

// ───────────── Hook ─────────────

export function HookView({ s }: { s: Of<'HOOK'> }) {
  const { scenario, provocation, analogy, bridge } = s.body;
  return (
    <div className="grid gap-4">
      <div className="dotgrid rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <span className="eyebrow">Picture this</span>
        <Rich text={scenario} className="mt-2 text-[16px] leading-relaxed text-ink" />
      </div>
      {provocation && (
        <p className="flex gap-2.5 font-display text-[17px] font-semibold tracking-tight text-ink">
          <Sparkles className="mt-1 size-4 shrink-0 text-brand" aria-hidden />
          {provocation}
        </p>
      )}
      {analogy && (
        <div className="grid gap-3 rounded-2xl border border-line bg-surface-2 p-4 sm:p-5">
          <span className="eyebrow">Think of it like this</span>
          <Rich text={analogy.text} />
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="grid grid-cols-2 border-b border-line bg-surface-2 px-3 py-1.5 font-mono text-[11px] font-semibold tracking-wide text-muted uppercase">
              <span>Everyday</span>
              <span>In this topic</span>
            </div>
            {analogy.mapping.map((m) => (
              <div
                key={m.everyday}
                className="grid grid-cols-2 gap-3 border-b border-line px-3 py-2 text-[13.5px] last:border-0"
              >
                <span>{m.everyday}</span>
                <span className="font-medium text-ink">{m.technical}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2.5 rounded-xl bg-warn-bg px-3.5 py-2.5 text-[13.5px] text-ink">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
            <div>
              <span className="font-semibold">Where the analogy breaks: </span>
              <Rich text={analogy.whereItBreaks} inline />
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-3 rounded-xl border border-brand/25 bg-brand-soft px-4 py-3 text-ink">
        <ArrowRight className="mt-1 size-4 shrink-0 text-brand" aria-hidden />
        <Rich text={bridge} />
      </div>
    </div>
  );
}

// ───────────── Explanation ─────────────

type Block = Of<'EXPLANATION'>['body']['blocks'][number];

export function ExplanationView({ s }: { s: Of<'EXPLANATION'> }) {
  return (
    <div className="grid gap-4">
      {s.body.blocks.map((b, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: blocks are positional
        <BlockView key={i} b={b} />
      ))}
    </div>
  );
}

function BlockView({ b }: { b: Block }) {
  switch (b.type) {
    case 'paragraph':
      return <Rich text={b.text} className="text-[15px] leading-relaxed" />;
    case 'steps':
      return (
        <ol className="grid gap-2.5">
          {b.items.map((item, i) => (
            <li key={item} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink font-mono text-[11.5px] font-bold text-surface">
                {i + 1}
              </span>
              <Rich text={item} className="pt-px" />
            </li>
          ))}
        </ol>
      );
    case 'bullets':
      return (
        <ul className="grid gap-2">
          {b.items.map((item) => (
            <li key={item} className="flex gap-2.5">
              <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
              <Rich text={item} />
            </li>
          ))}
        </ul>
      );
    case 'term':
      return (
        <div className="rounded-xl border border-line bg-surface px-4 py-3">
          <dt className="font-mono text-[13px] font-bold text-brand-deep">{b.term}</dt>
          <dd className="mt-1 text-[14px]">
            <Rich text={b.definition} inline />
          </dd>
        </div>
      );
    case 'table':
      return (
        <figure className="grid gap-1.5">
          {/* biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable regions must be keyboard-focusable (WCAG 2.1.1) */}
          <div className="overflow-x-auto rounded-xl border border-line" tabIndex={0}>
            <table className="w-full min-w-[28rem] border-collapse text-left text-[13.5px]">
              <thead className="bg-surface-2">
                <tr>
                  {b.columns.map((c) => (
                    <th key={c} scope="col" className="px-3 py-2 font-semibold text-ink">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row, r) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
                  <tr key={r} className="border-t border-line bg-surface align-top">
                    {row.map((cell, c) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional
                      <td key={c} className={cn('px-3 py-2', c === 0 && 'font-medium text-ink')}>
                        <Rich text={cell} inline />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {b.caption && <figcaption className="text-[12.5px] text-muted">{b.caption}</figcaption>}
        </figure>
      );
    case 'compare':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {[b.left, b.right].map((side, i) => (
            <div
              key={side.title}
              className={cn(
                'rounded-xl border p-4',
                i === 0 ? 'border-line bg-surface' : 'border-brand/25 bg-brand-soft/60',
              )}
            >
              <h4 className="font-sans text-[14px] font-semibold tracking-normal">{side.title}</h4>
              <ul className="mt-2 grid gap-1.5 text-[13.5px]">
                {side.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="text-muted" aria-hidden>
                      •
                    </span>
                    <Rich text={p} inline />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      );
    case 'note':
      return (
        <div className="flex gap-2.5 rounded-xl border border-line bg-surface-2 px-4 py-3 text-[14px]">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <Rich text={b.text} />
        </div>
      );
    case 'analogy_vs_reality':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-4">
            <span className="eyebrow">The analogy</span>
            <Rich text={b.analogy} className="mt-1.5 text-[14px]" />
          </div>
          <div className="rounded-xl border border-ok/30 bg-ok-bg p-4">
            <span className="eyebrow text-ok">What really happens</span>
            <Rich text={b.reality} className="mt-1.5 text-[14px] text-ink" />
          </div>
        </div>
      );
  }
}

// ───────────── Card deck ─────────────

type Card = Of<'CARD_DECK'>['body']['cards'][number];

export function CardDeckView({ s }: { s: Of<'CARD_DECK'> }) {
  const { layout, cards } = s.body;
  if (layout === 'swipe') return <SwipeCards cards={cards} />;
  if (layout === 'stepper') return <CardStepper cards={cards} />;
  if (layout === 'compare') {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]">
        {cards.map((c) => (
          <CardFace key={c.title} card={c} showBack />
        ))}
      </div>
    );
  }
  if (layout === 'grid') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <CardFace key={c.title} card={c} showBack />
        ))}
      </div>
    );
  }
  return <FlipCards cards={cards} />;
}

function CardFace({ card, showBack = false }: { card: Card; showBack?: boolean }) {
  return (
    <div className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
      {card.tag && <span className="eyebrow">{card.tag}</span>}
      <h4 className="font-sans text-[15px] font-semibold tracking-normal">
        {card.emoji && (
          <span className="mr-1.5" aria-hidden>
            {card.emoji}
          </span>
        )}
        {card.title}
      </h4>
      <Rich text={card.front} className="text-[14px]" />
      {showBack && card.back && (
        <Rich text={card.back} className="mt-1 border-t border-line pt-2 text-[13.5px]" />
      )}
    </div>
  );
}

function FlipCards({ cards }: { cards: Card[] }) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setFlipped((f) => {
      const next = new Set(f);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  return (
    <div className="grid gap-3">
      <p className="text-[12.5px] text-muted">
        Tap a card to flip it · {flipped.size} of {cards.length} flipped
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c, i) => {
          const on = flipped.has(i);
          return (
            <button
              key={c.title}
              type="button"
              aria-pressed={on}
              aria-label={`${c.title}: ${on ? 'showing the back' : 'showing the front'}. Flip card.`}
              onClick={() => c.back && toggle(i)}
              className="group text-left [perspective:1200px]"
            >
              <span
                className={cn(
                  'grid transition-transform duration-500 [transform-style:preserve-3d]',
                  on && '[transform:rotateY(180deg)]',
                )}
              >
                <span className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 shadow-soft [grid-area:1/1] [backface-visibility:hidden] group-hover:border-line-2">
                  <span className="flex items-center justify-between gap-2">
                    {c.tag ? <span className="eyebrow">{c.tag}</span> : <span />}
                    {c.back && <RotateCw className="size-3.5 text-muted" aria-hidden />}
                  </span>
                  <span className="font-display text-[16px] font-bold tracking-tight text-ink">
                    {c.emoji && (
                      <span className="mr-1.5" aria-hidden>
                        {c.emoji}
                      </span>
                    )}
                    {c.title}
                  </span>
                  <Rich text={c.front} className="text-[14px] text-ink-2" />
                </span>
                {c.back && (
                  <span className="flex flex-col gap-2 rounded-2xl border border-brand/30 bg-brand-soft p-4 [grid-area:1/1] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <span className="eyebrow text-brand">{c.title}</span>
                    <Rich text={c.back} className="text-[13.5px] text-ink" />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CardStepper({ cards }: { cards: Card[] }) {
  const [i, setI] = useState(0);
  const card = cards[i] as Card;
  return (
    <div className="grid gap-3">
      <CardFace card={card} showBack />
      <div className="flex items-center justify-between gap-3">
        <Button size="sm" variant="secondary" onClick={() => setI(i - 1)} disabled={i === 0}>
          <ChevronLeft className="size-4" aria-hidden /> Back
        </Button>
        <span className="sr-only" aria-live="polite">
          Card {i + 1} of {cards.length}
        </span>
        <div className="flex gap-1.5" aria-hidden>
          {cards.map((c, j) => (
            <span
              key={c.title}
              className={cn(
                'h-1.5 rounded-full transition-all',
                j === i ? 'w-5 bg-brand' : 'w-1.5 bg-line-2',
              )}
            />
          ))}
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setI(i + 1)}
          disabled={i === cards.length - 1}
        >
          Next <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

// ───────────── Diagram ─────────────

export function DiagramView({ s }: { s: Of<'DIAGRAM'> }) {
  const { nodes, edges, steps, caption, altText } = s.body;
  const layers = layerNodes(
    nodes.map((n) => n.id),
    edges,
  );
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const [step, setStep] = useState<number | null>(steps.length ? 0 : null);
  const current = step === null ? null : steps[step];
  const lit = new Set(current?.highlight ?? []);

  return (
    <figure className="grid gap-4">
      <p className="sr-only">{altText}</p>
      <div
        className="dotgrid flex flex-col items-stretch gap-2 rounded-2xl border border-line bg-surface p-4 md:flex-row md:items-center md:p-5"
        aria-hidden
      >
        {layers.map((layer, li) => (
          <div key={layer.join('|')} className="contents">
            {li > 0 && (
              <span className="grid shrink-0 place-items-center text-muted">
                <ArrowDown className="size-4 md:hidden" />
                <ArrowRight className="hidden size-4 md:block" />
              </span>
            )}
            <div className="flex flex-1 flex-col gap-2">
              {layer.map((id) => {
                const node = byId.get(id);
                if (!node) return null;
                const on = lit.has(id);
                return (
                  <div
                    key={id}
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-center transition-all duration-300',
                      on
                        ? 'scale-[1.03] border-brand bg-brand text-brand-ink shadow-lift'
                        : current
                          ? 'border-line bg-surface opacity-60'
                          : 'border-line-2 bg-surface',
                    )}
                  >
                    <div className="text-[13.5px] font-semibold">{node.label}</div>
                    {node.detail && (
                      <div className={cn('mt-0.5 text-[11.5px]', on ? 'opacity-90' : 'text-muted')}>
                        {node.detail}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {steps.length > 0 && (
        <div
          className="grid gap-3 rounded-2xl border border-line bg-surface-2 p-4"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="eyebrow">
              {current
                ? `Step ${(step ?? 0) + 1} of ${steps.length} · ${current.title}`
                : 'The whole picture'}
            </span>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setStep(step === null ? steps.length - 1 : Math.max(0, step - 1))}
                disabled={step === 0}
                aria-label="Previous step"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </Button>
              <Button
                size="sm"
                variant={step !== null && step < steps.length - 1 ? 'dark' : 'secondary'}
                onClick={() => setStep(step === null || step >= steps.length - 1 ? null : step + 1)}
              >
                {step === null ? 'Replay' : step < steps.length - 1 ? 'Next step' : 'Show all'}
                {step !== null && step < steps.length - 1 && (
                  <ChevronRight className="size-4" aria-hidden />
                )}
              </Button>
            </div>
          </div>
          {current ? (
            <Rich text={current.narration} className="text-[14px]" />
          ) : (
            <p className="text-[14px] text-ink-2">{altText}</p>
          )}
        </div>
      )}
      {caption && <figcaption className="text-[13px] text-muted">{caption}</figcaption>}
    </figure>
  );
}

// ───────────── Callout ─────────────

const CALLOUT = {
  interview_tip: {
    label: 'Interview tip',
    Icon: Mic,
    box: 'border-brand/30 bg-brand-soft',
    icon: 'text-brand',
  },
  misconception: {
    label: 'Common misconception',
    Icon: TriangleAlert,
    box: 'border-bad/30 bg-bad-bg',
    icon: 'text-bad',
  },
  pitfall: {
    label: 'Watch out',
    Icon: TriangleAlert,
    box: 'border-warn/30 bg-warn-bg',
    icon: 'text-warn',
  },
  real_world: {
    label: 'In the real world',
    Icon: Zap,
    box: 'border-ok/30 bg-ok-bg',
    icon: 'text-ok',
  },
  remember: {
    label: 'Remember',
    Icon: Lightbulb,
    box: 'border-g3/30 bg-surface-2',
    icon: 'text-g3',
  },
} as const;

export function CalloutView({ s }: { s: Of<'CALLOUT'> }) {
  const c = CALLOUT[s.body.tone];
  return (
    <aside className={cn('flex gap-3 rounded-2xl border p-4 sm:p-5', c.box)}>
      <c.Icon className={cn('mt-0.5 size-5 shrink-0', c.icon)} aria-hidden />
      <div className="min-w-0">
        <span className={cn('eyebrow', c.icon)}>{c.label}</span>
        <h4 className="mt-1 font-sans text-[15.5px] font-semibold tracking-normal">
          {s.body.title}
        </h4>
        <Rich text={s.body.body} className="mt-1.5 text-[14px] text-ink" />
      </div>
    </aside>
  );
}

// ───────────── Interview playbook ─────────────

export function InterviewPlaybookView({ s }: { s: Of<'INTERVIEW_PLAYBOOK'> }) {
  const { question, totalMinutes, steps, followUps } = s.body;
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-ink p-5 text-surface">
        <span className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase opacity-70">
          <Mic className="size-3.5" aria-hidden /> The interviewer asks
        </span>
        <Rich
          text={question}
          className="mt-2 font-display text-[17px] font-semibold tracking-tight"
        />
        {totalMinutes && (
          <span className="mt-3 inline-block rounded-md bg-surface/15 px-2 py-0.5 font-mono text-[11.5px]">
            Answer in about {totalMinutes} min
          </span>
        )}
      </div>
      <ol className="relative grid gap-3 pl-8 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-line-2">
        {steps.map((st, i) => (
          <li key={st.title} className="relative">
            <span className="absolute top-0.5 -left-8 grid size-6 place-items-center rounded-full border border-brand bg-surface font-mono text-[11px] font-bold text-brand">
              {i + 1}
            </span>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h4 className="font-sans text-[14.5px] font-semibold tracking-normal">{st.title}</h4>
              {st.minutes !== undefined && (
                <span className="font-mono text-[11.5px] text-muted">{st.minutes} min</span>
              )}
            </div>
            <Rich text={st.detail} className="mt-1 text-[13.5px]" />
          </li>
        ))}
      </ol>
      {followUps.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface-2 p-4">
          <span className="eyebrow">Follow-ups to expect</span>
          <ul className="mt-2 grid gap-1.5 text-[13.5px]">
            {followUps.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-brand" aria-hidden>
                  ?
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ───────────── Summary ─────────────

export function SummaryView({ s }: { s: Of<'SUMMARY'> }) {
  return (
    <div className="grid gap-4">
      <ul className="grid gap-2.5">
        {s.body.takeaways.map((t) => (
          <li key={t} className="flex gap-3 rounded-xl border border-line bg-surface px-4 py-3">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
            <Rich text={t} className="text-[14.5px]" />
          </li>
        ))}
      </ul>
      {s.body.remember.length > 0 && (
        <div>
          <span className="eyebrow">Say it in one line</span>
          <ul className="mt-2 flex flex-wrap gap-2">
            {s.body.remember.map((r) => (
              <li
                key={r}
                className="rounded-full border border-brand/25 bg-brand-soft px-3 py-1 text-[13px] font-medium text-brand-deep"
              >
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
