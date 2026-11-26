import type { Difficulty } from '../types';

const STYLE: Record<Difficulty, { cls: string; bars: number }> = {
  Beginner: { cls: 'bg-ok-bg text-ok', bars: 1 },
  Intermediate: { cls: 'bg-warn-bg text-warn', bars: 2 },
  Advanced: { cls: 'bg-bad-bg text-bad', bars: 3 },
};

/** Difficulty as text plus a 1–3 bar glyph, so it never relies on colour alone. */
export function DifficultyBadge({ level }: { level: Difficulty }) {
  const s = STYLE[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide ${s.cls}`}
    >
      <span className="flex items-end gap-px" aria-hidden>
        {[1, 2, 3].map((b) => (
          <span
            key={b}
            className={`w-[3px] rounded-sm bg-current ${b <= s.bars ? '' : 'opacity-25'}`}
            style={{ height: 4 + b * 2 }}
          />
        ))}
      </span>
      {level}
    </span>
  );
}
