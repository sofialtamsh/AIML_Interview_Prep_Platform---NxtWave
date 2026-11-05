import type { ColorKey, StudentBracket, StudentRole } from '@app/contracts';
import { AvailabilityBadge, Chip, cn } from '@app/ui';
import { useMutation } from '@tanstack/react-query';
import { Bell, BellRing, Check } from 'lucide-react';
import { api, queryClient } from '../../lib/api';
import { keys } from '../../lib/queries';

export const tint = (c: ColorKey) => ({
  background: `color-mix(in srgb, var(--${c}) 14%, var(--surface))`,
  color: `var(--${c})`,
});

export function RoleBadge({
  code,
  color,
  size = 40,
}: {
  code: string;
  color: ColorKey;
  size?: number;
}) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[10px] font-mono text-[13px] font-bold"
      style={{ ...tint(color), width: size, height: size }}
      aria-hidden
    >
      {code}
    </span>
  );
}

/** "Notify me when it's live" toggle for roles and packages that are not open yet. */
export function NotifyButton({
  kind,
  id,
  on,
}: {
  kind: 'ROLE' | 'BRACKET';
  id: string;
  on: boolean;
}) {
  const toggle = useMutation({
    mutationFn: () => api.post('/student/interest', { kind, targetId: id, notify: !on }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.catalog }),
  });
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle.mutate();
      }}
      disabled={toggle.isPending}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition',
        on ? 'bg-ok-bg text-ok' : 'bg-ink text-surface hover:opacity-90',
      )}
    >
      {on ? (
        <BellRing className="size-3.5" aria-hidden />
      ) : (
        <Bell className="size-3.5" aria-hidden />
      )}
      {on ? "We'll tell you" : 'Notify me'}
    </button>
  );
}

export function RolePicker({
  roles,
  value,
  onChange,
}: {
  roles: StudentRole[];
  value?: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Career role">
      {roles.map((r) => {
        const live = r.availability === 'LIVE';
        const selected = value === r.id;
        return (
          // biome-ignore lint/a11y/useSemanticElements: a rich card cannot be a native radio input
          <div
            key={r.id}
            role="radio"
            aria-checked={selected}
            aria-disabled={!live}
            tabIndex={live ? 0 : -1}
            onClick={() => live && onChange(r.id)}
            onKeyDown={(e) => {
              if (live && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onChange(r.id);
              }
            }}
            className={cn(
              'relative grid content-start gap-3 rounded-2xl border-[1.5px] bg-surface p-5 text-left transition',
              live
                ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]'
                : 'opacity-80',
              selected ? 'border-brand shadow-[0_0_0_4px_var(--brand-soft)]' : 'border-line',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <RoleBadge code={r.shortCode} color={r.colorKey} />
              {selected ? (
                <span className="grid size-6 place-items-center rounded-full bg-brand text-brand-ink">
                  <Check className="size-4" aria-hidden />
                </span>
              ) : (
                <AvailabilityBadge value={r.availability} />
              )}
            </div>
            <div>
              <h3 className="text-[17px]">{r.title}</h3>
              <p className="mt-1 text-sm text-ink-2">{r.tagline}</p>
            </div>
            {selected && (
              <ul className="grid gap-1.5 border-t border-line pt-3 text-[13px] text-ink-2">
                {r.competencies.slice(0, 5).map((c) => (
                  <li key={c} className="flex gap-2">
                    <span className="text-brand">✓</span>
                    {c}
                  </li>
                ))}
              </ul>
            )}
            {!live && (
              <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                <span className="text-xs text-muted">Opening soon</span>
                <NotifyButton kind="ROLE" id={r.id} on={r.notifyMe} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BracketPicker({
  brackets,
  value,
  onChange,
}: {
  brackets: StudentBracket[];
  value?: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Target package">
      {brackets.map((b) => {
        const live = b.availability === 'LIVE';
        const selected = value === b.id;
        return (
          // biome-ignore lint/a11y/useSemanticElements: a rich card cannot be a native radio input
          <div
            key={b.id}
            role="radio"
            aria-checked={selected}
            aria-disabled={!live}
            tabIndex={live ? 0 : -1}
            onClick={() => live && onChange(b.id)}
            onKeyDown={(e) => {
              if (live && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onChange(b.id);
              }
            }}
            className={cn(
              'grid content-start gap-2 rounded-2xl border-[1.5px] bg-surface p-5 text-left transition',
              live
                ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]'
                : 'opacity-80',
              selected ? 'border-brand shadow-[0_0_0_4px_var(--brand-soft)]' : 'border-line',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-display text-[26px] font-bold tracking-tight">{b.label}</span>
              {selected ? (
                <span className="grid size-6 place-items-center rounded-full bg-brand text-brand-ink">
                  <Check className="size-4" aria-hidden />
                </span>
              ) : (
                <AvailabilityBadge value={b.availability} />
              )}
            </div>
            <b className="text-[15px]">{b.headline}</b>
            <p className="text-[13.5px] text-ink-2">{b.expectations}</p>
            {!live && (
              <div className="mt-1 flex items-center justify-between gap-2 border-t border-line pt-3">
                <span className="text-xs text-muted">Opening soon</span>
                <NotifyButton kind="BRACKET" id={b.id} on={b.notifyMe} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const LEVELS = [
  { level: 0, emoji: '😶', label: 'New to it' },
  { level: 1, emoji: '🙂', label: 'Know the basics' },
  { level: 2, emoji: '😎', label: 'Comfortable' },
  { level: 3, emoji: '🚀', label: 'Confident' },
] as const;

export function SkillRater({
  areas,
  value,
  onChange,
}: {
  areas: Array<{ id: string; name: string; description?: string }>;
  value: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
}) {
  return (
    <div className="grid gap-3">
      {areas.map((a) => (
        <fieldset key={a.id} className="rounded-2xl border border-line bg-surface p-4">
          <legend className="sr-only">{a.name}</legend>
          <div className="mb-3">
            <b className="text-[15px]">{a.name}</b>
            {a.description && <p className="text-[13px] text-muted">{a.description}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LEVELS.map((l) => {
              const on = value[a.id] === l.level;
              return (
                <button
                  key={l.level}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onChange({ ...value, [a.id]: l.level })}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border-[1.5px] px-3 py-2.5 text-left text-[13px] font-medium transition',
                    on
                      ? 'border-brand bg-brand-soft text-brand-deep'
                      : 'border-line hover:border-line-2',
                  )}
                >
                  <span className="text-lg" aria-hidden>
                    {l.emoji}
                  </span>
                  {l.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export const WEEKDAYS = [
  { day: 1, short: 'Mon' },
  { day: 2, short: 'Tue' },
  { day: 3, short: 'Wed' },
  { day: 4, short: 'Thu' },
  { day: 5, short: 'Fri' },
  { day: 6, short: 'Sat' },
  { day: 0, short: 'Sun' },
] as const;

const PRESETS = [30, 45, 60, 90, 120, 180];

/** 45 → "45 min", 90 → "1 h 30 min", 120 → "2 h". */
export function presetLabel(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}

export interface ScheduleValue {
  dailyMinutes: number;
  studyWeekdays: number[];
  deadline: string | null;
}

export function todayIso() {
  return new Intl.DateTimeFormat('en-CA').format(new Date());
}

function plusDays(iso: string, n: number) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

export function formatHours(minutes: number) {
  const h = minutes / 60;
  return Number.isInteger(h) ? `${h} h` : `${h.toFixed(1)} h`;
}

export function ScheduleEditor({
  value,
  onChange,
  errors = {},
}: {
  value: ScheduleValue;
  onChange: (next: ScheduleValue) => void;
  errors?: Record<string, string>;
}) {
  const weekly = value.dailyMinutes * value.studyWeekdays.length;
  const today = todayIso();
  const err = (k: string) => errors[k] ?? errors[`schedule.${k}`];

  return (
    <div className="grid gap-6">
      <section>
        <h3 className="text-[15px]">Minutes per study day</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((m) => (
            <Chip
              key={m}
              selected={value.dailyMinutes === m}
              onClick={() => onChange({ ...value, dailyMinutes: m })}
            >
              {presetLabel(m)}
            </Chip>
          ))}
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm">
          <span className="font-mono text-xs text-muted">custom</span>
          <input
            type="range"
            min={15}
            max={360}
            step={5}
            value={value.dailyMinutes}
            onChange={(e) => onChange({ ...value, dailyMinutes: Number(e.target.value) })}
            className="flex-1 accent-[var(--brand)]"
            aria-label="Minutes per day"
          />
          <b className="w-16 text-right font-mono">{value.dailyMinutes} min</b>
        </label>
        {err('dailyMinutes') && (
          <p className="mt-1 text-[13px] font-medium text-bad">{err('dailyMinutes')}</p>
        )}
      </section>

      <section>
        <h3 className="text-[15px]">Which days can you study?</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {WEEKDAYS.map((w) => {
            const on = value.studyWeekdays.includes(w.day);
            return (
              <Chip
                key={w.day}
                selected={on}
                onClick={() =>
                  onChange({
                    ...value,
                    studyWeekdays: on
                      ? value.studyWeekdays.filter((d) => d !== w.day)
                      : [...value.studyWeekdays, w.day],
                  })
                }
              >
                {w.short}
              </Chip>
            );
          })}
        </div>
        {err('studyWeekdays') && (
          <p className="mt-1 text-[13px] font-medium text-bad">{err('studyWeekdays')}</p>
        )}
      </section>

      <section>
        <h3 className="text-[15px]">Do you have a deadline?</h3>
        <p className="text-[13px] text-muted">
          An interview date, placement season or your own target.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip
            selected={value.deadline === null}
            onClick={() => onChange({ ...value, deadline: null })}
          >
            No fixed date
          </Chip>
          <Chip
            selected={value.deadline !== null}
            onClick={() => onChange({ ...value, deadline: value.deadline ?? plusDays(today, 60) })}
          >
            Yes, by a date
          </Chip>
          {value.deadline !== null && (
            <input
              type="date"
              value={value.deadline}
              min={plusDays(today, 7)}
              max={plusDays(today, 3 * 365)}
              onChange={(e) => onChange({ ...value, deadline: e.target.value || null })}
              className="rounded-[10px] border border-line-2 bg-surface px-3 py-1.5 text-sm"
              aria-label="Deadline"
            />
          )}
        </div>
        {err('deadline') && (
          <p className="mt-1 text-[13px] font-medium text-bad">{err('deadline')}</p>
        )}
      </section>

      <div className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand-deep">
        That's <b>{formatHours(weekly)}</b> a week across <b>{value.studyWeekdays.length}</b> day
        {value.studyWeekdays.length === 1 ? '' : 's'}. Small, steady sessions beat weekend
        marathons.
      </div>
    </div>
  );
}
