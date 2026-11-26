import type { ReactNode } from 'react';

export function SectionHeading({
  eyebrow,
  title,
  children,
  align = 'left',
  id,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  align?: 'left' | 'center';
  /** Set on the heading, for a section's aria-labelledby. */
  id?: string;
}) {
  return (
    <header className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <span className="eyebrow text-brand">{eyebrow}</span>
      <h2 id={id} className="mt-3 text-[clamp(26px,3.4vw,38px)]">
        {title}
      </h2>
      {children && <p className="mt-3 text-[16px] leading-relaxed text-ink-2">{children}</p>}
    </header>
  );
}
