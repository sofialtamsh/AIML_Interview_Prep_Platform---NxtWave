import type { LessonModuleResponse, LessonVersionResponse } from '@app/contracts';
import { Badge, Card, cn } from '@app/ui';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { timeAgo } from '../../../components/table';
import { STATUS } from './shared';

const DECISION = {
  APPROVED: { label: 'Approved', tone: 'ok' },
  CHANGES_REQUESTED: { label: 'Changes requested', tone: 'warn' },
  REJECTED: { label: 'Rejected', tone: 'bad' },
} as const;

export function ReviewTab({
  v,
  module,
}: {
  v: LessonVersionResponse;
  module: LessonModuleResponse;
}) {
  const depthName = new Map(module.depthLevels.map((d) => [d.rank, d.name]));
  const budgets = (depth: number) => module.targets.filter((t) => t.depth.rank === depth);
  const added = v.sections.filter((s) => s.change === 'ADDED').map((s) => s.key);
  const changed = v.sections.filter((s) => s.change === 'CHANGED').map((s) => s.key);
  const comparing =
    module.publishedVersionId !== null && module.publishedVersionId !== v.version.id;

  return (
    <div className="grid gap-5">
      <section className="grid gap-3">
        <h2 className="text-base">Reviewer checklist</h2>
        <p className="-mt-1 text-[13px] text-muted">
          What each depth in use actually contains. It guides the review; it never blocks
          publishing.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {v.depthReports.map((d) => (
            <Card key={d.depth} className="grid gap-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-sans text-[15px] font-semibold tracking-normal">
                  Depth {d.depth} · {depthName.get(d.depth) ?? ''}
                </h3>
                <span className="font-mono text-[12px] text-muted">
                  {d.sectionKeys.length} steps · {d.minutes} min · {d.objectives} objectives
                </span>
              </div>
              {budgets(d.depth).map((t) => (
                <p key={`${t.roleId}-${t.bracketId}`} className="text-[12.5px] text-ink-2">
                  {t.roleTitle} {t.bracketLabel}: the roadmap budgets {t.plannedMinutes} min for the
                  lesson
                  {Math.abs(d.minutes - t.plannedMinutes) > t.plannedMinutes * 0.5 && (
                    <span className="font-semibold text-warn">
                      {' '}
                      (the lesson is {d.minutes > t.plannedMinutes ? 'much longer' : 'much shorter'}
                      )
                    </span>
                  )}
                </p>
              ))}
              <ul className="grid gap-1.5">
                {d.checks.map((c) => (
                  <li key={c.key} className="flex gap-2 text-[13px]">
                    {c.ok ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />
                    ) : (
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
                    )}
                    <span className={cn(!c.ok && 'font-medium text-ink')}>{c.message}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {comparing && (
        <section className="grid gap-2">
          <h2 className="text-base">Changes compared with the live version</h2>
          <Card className="grid gap-2 p-4 text-[13px]">
            <Row label="New steps" keys={added} />
            <Row label="Changed steps" keys={changed} />
            <Row label="Removed steps" keys={v.removedKeys} />
          </Card>
        </section>
      )}

      <section className="grid gap-2">
        <h2 className="text-base">Review history</h2>
        {v.reviews.length === 0 ? (
          <p className="text-[13px] text-muted">No reviews yet for this version.</p>
        ) : (
          <ol className="grid gap-2">
            {v.reviews.map((r) => (
              <li key={r.id}>
                <Card className="grid gap-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={DECISION[r.decision].tone}>{DECISION[r.decision].label}</Badge>
                    <span className="text-[12.5px] text-muted">
                      {r.reviewer} · {timeAgo(r.createdAt)}
                    </span>
                  </div>
                  {r.notes && <p className="text-[13.5px] whitespace-pre-wrap">{r.notes}</p>}
                  {Object.entries(r.sectionNotes).length > 0 && (
                    <ul className="grid gap-1.5">
                      {Object.entries(r.sectionNotes).map(([key, note]) => (
                        <li
                          key={key}
                          className="rounded-lg border border-warn/30 bg-warn-bg px-3 py-2 text-[13px]"
                        >
                          <code className="font-mono text-[11.5px] font-semibold">{key}</code>
                          <p className="mt-0.5 text-ink">{note}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="grid gap-2">
        <h2 className="text-base">All versions</h2>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <tbody>
              {module.versions.map((x) => (
                <tr
                  key={x.id}
                  className={cn(
                    'border-b border-line last:border-0',
                    x.id === v.version.id && 'bg-surface-2',
                  )}
                >
                  <td className="px-3 py-2 font-mono font-semibold">v{x.versionNumber}</td>
                  <td className="px-3 py-2">
                    <Badge tone={STATUS[x.status].tone}>{STATUS[x.status].label}</Badge>
                  </td>
                  <td className="px-3 py-2 text-ink-2">{x.changeNote ?? '–'}</td>
                  <td className="px-3 py-2 text-right text-[12px] text-muted">
                    {x.publishedAt
                      ? `published ${timeAgo(x.publishedAt)}`
                      : `created ${timeAgo(x.createdAt)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}

function Row({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1">
      <span className="w-32 shrink-0 font-semibold">{label}</span>
      {keys.length === 0 ? (
        <span className="text-muted">None</span>
      ) : (
        keys.map((k) => (
          <code key={k} className="rounded-md bg-surface-2 px-1.5 font-mono text-[12px]">
            {k}
          </code>
        ))
      )}
    </div>
  );
}
