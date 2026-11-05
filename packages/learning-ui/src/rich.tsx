import { cn } from '@app/ui';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { useLessonRuntime } from './context';
import { parseRich, type RichNode, splitParagraphs } from './rich-parse';

/** Renders lesson markdown as React text nodes (never as HTML). */
export function Rich({
  text,
  inline = false,
  className,
}: {
  text: string;
  inline?: boolean;
  className?: string;
}) {
  if (inline) return <span className={className}>{render(parseRich(text))}</span>;
  const paragraphs = splitParagraphs(text);
  return (
    <div className={cn('grid gap-2.5', className)}>
      {paragraphs.map((p, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: paragraphs have no identity beyond order
        <p key={i}>{render(parseRich(p))}</p>
      ))}
    </div>
  );
}

function render(nodes: RichNode[]): ReactNode[] {
  return nodes.map((n, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: parsed rich text is positional and never reordered
    <RichPart key={i} n={n} />
  ));
}

function RichPart({ n }: { n: RichNode }): ReactNode {
  switch (n.type) {
    case 'text':
      return n.text;
    case 'break':
      return <br />;
    case 'strong':
      return <strong className="font-semibold text-ink">{render(n.children)}</strong>;
    case 'em':
      return <em>{render(n.children)}</em>;
    case 'code':
      return (
        <code className="rounded-[5px] border border-line bg-surface-2 px-1.5 py-px font-mono text-[0.86em] text-ink">
          {n.text}
        </code>
      );
    case 'link':
      return (
        <a
          href={n.href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-medium text-brand underline decoration-brand/40 underline-offset-2 hover:decoration-brand"
        >
          {render(n.children)}
        </a>
      );
    case 'term':
      return <TermChip term={n.term} label={n.label} />;
  }
}

/** A glossary term: tap to see its definition from this lesson. */
function TermChip({ term, label }: { term: string; label: string }) {
  const { glossary } = useLessonRuntime();
  const definition = glossary.get(term);
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (!definition) {
    return <span className="font-medium text-ink underline decoration-dotted">{label}</span>;
  }
  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="rounded-[5px] bg-brand-soft px-1 font-medium text-brand-deep underline decoration-dotted underline-offset-2"
      >
        {label}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute top-full left-0 z-20 mt-1.5 block w-[min(18rem,80vw)] rounded-xl border border-line bg-surface p-3 text-[13px] leading-snug text-ink-2 shadow-lift"
        >
          <span className="mb-1 block font-mono text-[11px] font-bold tracking-wide text-ink uppercase">
            {label}
          </span>
          <Rich text={definition} inline />
        </span>
      )}
    </span>
  );
}
