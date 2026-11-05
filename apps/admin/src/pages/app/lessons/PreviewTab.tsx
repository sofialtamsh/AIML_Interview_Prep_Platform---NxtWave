import type { StudentSection } from '@app/content';
import type { LessonModuleResponse, LessonVersionResponse, SectionChange } from '@app/contracts';
import { LessonRuntimeProvider, SectionBody, SectionHeader, sectionTitle } from '@app/learning-ui';
import { Badge, Button, Card, Chip, cn, SelectField } from '@app/ui';
import { MessageSquarePlus, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  PRIOR_KNOWLEDGE,
  type PreviewTarget,
  previewRuntime,
  resolvePreview,
  revisionMap,
} from './shared';

const CHANGE_BADGE: Record<SectionChange, { label: string; tone: 'next' | 'warn' } | null> = {
  ADDED: { label: 'New', tone: 'next' },
  CHANGED: { label: 'Changed', tone: 'warn' },
  UNCHANGED: null,
};

/** Picks a student profile to preview as: a curriculum target, or any depth. */
export function useTargetPicker(module: LessonModuleResponse, initialIndex = 0) {
  const first = module.targets[initialIndex] ?? module.targets[0];
  const [choice, setChoice] = useState<string>(
    first ? `${first.roleId}:${first.bracketId}` : 'custom',
  );
  const [depth, setDepth] = useState(first?.depth.rank ?? 3);
  const [skill, setSkill] = useState(0);
  const target = module.targets.find((t) => `${t.roleId}:${t.bracketId}` === choice);
  const value: PreviewTarget = {
    depth: target ? target.depth.rank : depth,
    roleSlug: target ? target.roleSlug : null,
    skillLevel: skill,
  };
  const label = target
    ? `${target.roleTitle} · ${target.bracketLabel} (${target.depth.name})`
    : `Depth ${depth} · ${module.depthLevels.find((d) => d.rank === depth)?.name ?? ''}`;

  const picker = (
    <div className="grid gap-3">
      <fieldset className="flex flex-wrap gap-1.5">
        <legend className="sr-only">Preview as</legend>
        {module.targets.map((t) => {
          const id = `${t.roleId}:${t.bracketId}`;
          return (
            <Chip key={id} selected={choice === id} onClick={() => setChoice(id)}>
              {t.roleShortCode} · {t.bracketLabel} · {t.depth.name}
            </Chip>
          );
        })}
        <Chip selected={choice === 'custom'} onClick={() => setChoice('custom')}>
          Any depth
        </Chip>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        {choice === 'custom' && (
          <SelectField
            label="Depth"
            value={String(depth)}
            onChange={(e) => setDepth(Number(e.target.value))}
            options={module.depthLevels.map((d) => ({
              value: String(d.rank),
              label: `${d.rank} · ${d.name}`,
            }))}
          />
        )}
        <SelectField
          label="Student's prior knowledge"
          value={String(skill)}
          onChange={(e) => setSkill(Number(e.target.value))}
          options={PRIOR_KNOWLEDGE.map((p) => ({ value: String(p.value), label: p.label }))}
        />
      </div>
    </div>
  );
  return { value, label, picker };
}

export function PreviewTab({
  v,
  module,
  notes,
  onNote,
  onRewrite,
}: {
  v: LessonVersionResponse;
  module: LessonModuleResponse;
  /** Section notes while reviewing; null when this version is not under review. */
  notes: Record<string, string> | null;
  onNote: (key: string, text: string) => void;
  /** Offered on drafts when AI is on. */
  onRewrite?: (key: string, title: string) => void;
}) {
  const { value, label, picker } = useTargetPicker(module);
  const runtime = useMemo(() => previewRuntime(v.document), [v.document]);
  const preview = useMemo(() => resolvePreview(v.document, value, revisionMap(v)), [v, value]);
  const meta = new Map(v.document.sections.map((s) => [s.key, s]));
  const changes = new Map(v.sections.map((s) => [s.key, s.change]));
  const showChanges =
    module.publishedVersionId !== null && module.publishedVersionId !== v.version.id;

  return (
    <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4 lg:sticky lg:top-6 lg:self-start">
        <Card className="grid gap-4 p-4">
          <span className="eyebrow">Preview as</span>
          {picker}
          <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-[13px]">
            <b>{preview.sections.length} steps</b> · about {preview.minutes} min ·{' '}
            {preview.objectives} {preview.objectives === 1 ? 'objective' : 'objectives'}
          </div>
        </Card>
        <Card className="p-2">
          <ol className="grid grid-cols-[minmax(0,1fr)] gap-0.5">
            {preview.sections.map((s, i) => (
              <li key={s.key}>
                <a
                  href={`#step-${s.key}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] text-ink-2 hover:bg-surface-2"
                >
                  <span className="w-5 font-mono text-[10.5px] text-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{sectionTitle(s)}</span>
                  {notes?.[s.key] && (
                    <MessageSquarePlus className="size-3.5 text-warn" aria-label="Has a note" />
                  )}
                </a>
              </li>
            ))}
          </ol>
        </Card>
      </aside>

      <LessonRuntimeProvider value={runtime}>
        <div className="grid min-w-0 gap-5">
          <Card className="dotgrid grid gap-2 p-5">
            <span className="eyebrow">Previewing as {label}</span>
            <h2 className="text-[24px]">{v.document.title}</h2>
            {v.document.subtitle && <p className="text-ink-2">{v.document.subtitle}</p>}
            <ul className="mt-1 grid gap-1 text-[13.5px]">
              {v.document.objectives
                .filter((o) => o.minDepthRank <= value.depth)
                .map((o) => (
                  <li key={o.key} className="flex gap-2">
                    <span className="text-brand">✓</span>
                    {o.text}
                  </li>
                ))}
            </ul>
          </Card>
          {preview.sections.map((s) => {
            const authored = meta.get(s.key);
            const change = showChanges ? CHANGE_BADGE[changes.get(s.key) ?? 'UNCHANGED'] : null;
            return (
              <Card
                key={`${s.key}-${value.depth}-${value.skillLevel}`}
                id={`step-${s.key}`}
                className="scroll-mt-6 overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-surface-2 px-4 py-2 font-mono text-[11px] text-muted">
                  <span className="font-semibold text-ink-2">{s.key}</span>
                  <span>{s.kind}</span>
                  <span>depth ≥ {s.depthRank}</span>
                  {authored?.slotKey && <span>slot {authored.slotKey}</span>}
                  {authored && authored.roleScope.length > 0 && (
                    <span>only {authored.roleScope.join(', ')}</span>
                  )}
                  {s.conceptKeys.length > 0 && (
                    <span className="truncate">{s.conceptKeys.join(' · ')}</span>
                  )}
                  {change && <Badge tone={change.tone}>{change.label}</Badge>}
                  {onRewrite && (
                    <button
                      type="button"
                      onClick={() => onRewrite(s.key, sectionTitle(s))}
                      className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-sans text-[12px] font-semibold text-brand hover:bg-brand-soft"
                    >
                      <Wand2 className="size-3.5" aria-hidden /> Rewrite with AI
                    </button>
                  )}
                </div>
                <div className="grid gap-5 p-4 sm:p-6">
                  <SectionHeader section={s as StudentSection} />
                  <SectionBody section={s as StudentSection} />
                  {notes !== null && (
                    <SectionNote value={notes[s.key] ?? ''} onChange={(t) => onNote(s.key, t)} />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </LessonRuntimeProvider>
    </div>
  );
}

function SectionNote({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const [open, setOpen] = useState(value !== '');
  if (!open) {
    return (
      <Button size="sm" variant="ghost" className="w-fit" onClick={() => setOpen(true)}>
        <MessageSquarePlus className="size-3.5" aria-hidden /> Add a review note on this step
      </Button>
    );
  }
  return (
    <label className={cn('grid gap-1.5 rounded-xl border border-warn/40 bg-warn-bg p-3')}>
      <span className="text-[12.5px] font-semibold text-ink">Review note for this step</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="What should change here?"
        className="w-full resize-y rounded-lg border border-line-2 bg-surface px-3 py-2 text-[13.5px] outline-none focus:border-brand"
      />
    </label>
  );
}
