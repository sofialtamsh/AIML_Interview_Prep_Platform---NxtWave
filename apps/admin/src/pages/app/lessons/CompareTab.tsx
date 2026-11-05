import type { LessonModuleResponse, LessonVersionResponse } from '@app/contracts';
import { KIND_LABEL, sectionTitle } from '@app/learning-ui';
import { Alert, Card, cn } from '@app/ui';
import { useMemo } from 'react';
import { useTargetPicker } from './PreviewTab';
import { resolvePreview } from './shared';

/** Two packages side by side: the same lesson, at two depths. */
export function CompareTab({
  v,
  module,
}: {
  v: LessonVersionResponse;
  module: LessonModuleResponse;
}) {
  const a = useTargetPicker(module, 0);
  const b = useTargetPicker(module, Math.min(1, module.targets.length - 1));
  const left = useMemo(() => resolvePreview(v.document, a.value), [v.document, a.value]);
  const right = useMemo(() => resolvePreview(v.document, b.value), [v.document, b.value]);
  const leftKeys = new Set(left.sections.map((s) => s.key));
  const rightKeys = new Set(right.sections.map((s) => s.key));

  return (
    <div className="grid gap-4">
      {module.targets.length < 2 && (
        <Alert tone="info">
          Only{' '}
          {module.targets.length === 1
            ? 'one published curriculum uses'
            : 'no published curriculum uses'}{' '}
          this subtopic. Pick "Any depth" on one side to compare depths.
        </Alert>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { side: a, data: left, other: rightKeys },
          { side: b, data: right, other: leftKeys },
        ].map(({ side, data, other }, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: two fixed columns
          <Card key={i} className="grid content-start gap-4 p-4">
            {side.picker}
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Steps" value={data.sections.length} />
              <Stat label="Minutes" value={data.minutes} />
              <Stat label="Objectives" value={data.objectives} />
            </div>
            <ol className="grid gap-1">
              {data.sections.map((s, n) => {
                const only = !other.has(s.key);
                return (
                  <li
                    key={s.key}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12.5px]',
                      only ? 'border-brand/40 bg-brand-soft' : 'border-line bg-surface',
                    )}
                  >
                    <span className="w-5 font-mono text-[10.5px] text-muted">{n + 1}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <b className="font-medium text-ink">{sectionTitle(s)}</b>
                      <span className="ml-1.5 text-muted">{KIND_LABEL[s.kind]}</span>
                    </span>
                    {s.fastTrack && (
                      <span className="font-mono text-[10px] text-g3">REFRESHER</span>
                    )}
                    <span className="font-mono text-[10.5px] text-muted">
                      {s.estimatedMinutes}m
                    </span>
                  </li>
                );
              })}
            </ol>
            <span className="text-[11.5px] text-muted">
              <span className="mr-1 inline-block size-2.5 rounded-sm bg-brand-soft ring-1 ring-brand/40" />{' '}
              Only on this side
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface-2 px-2 py-2">
      <div className="font-display text-[20px] font-bold">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
