import type { LessonIndexResponse, LessonIndexRow } from '@app/contracts';
import { Alert, Badge, Card, cn, errorMessage, Spinner } from '@app/ui';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CircleDashed, Eye, PencilLine } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { PageHeader, Tabs, timeAgo, tint } from '../../../components/table';
import { api } from '../../../lib/api';
import { lessonKeys, STATUS } from './shared';

const FILTERS = [
  { id: 'all', label: 'All lessons' },
  { id: 'review', label: 'Needs review' },
  { id: 'missing', label: 'Not started' },
] as const;
type Filter = (typeof FILTERS)[number]['id'];

const needsReview = (r: LessonIndexRow) =>
  r.working?.status === 'UNDER_REVIEW' ||
  r.working?.status === 'APPROVED' ||
  r.working?.status === 'AI_GENERATED';

export function LessonsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const index = useQuery({
    queryKey: lessonKeys.index,
    queryFn: () => api.get<LessonIndexResponse>('/content/lessons'),
  });

  return (
    <div className="grid gap-5 animate-rise">
      <PageHeader
        eyebrow="Content"
        title="Lessons"
        sub="One lesson per subtopic, shared by every role and package. Each student sees the depth their target needs. Nothing reaches students until someone approves and publishes it."
      />
      {index.isPending && <Spinner />}
      {index.isError && <Alert tone="bad">{errorMessage(index.error)}</Alert>}
      {index.data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Count label="Published" value={index.data.counts.published} tone="text-ok" />
            <Count label="Waiting for review" value={index.data.counts.inReview} tone="text-warn" />
            <Count label="Being written" value={index.data.counts.inProgress} tone="text-brand" />
            <Count label="Not started" value={index.data.counts.missing} tone="text-muted" />
          </div>
          <Tabs tabs={FILTERS} value={filter} onChange={setFilter} />
          <div className="grid gap-4">
            {index.data.topics.map((t) => {
              const rows = t.subtopics.filter((s) =>
                filter === 'all'
                  ? true
                  : filter === 'review'
                    ? needsReview(s)
                    : !s.published && !s.working,
              );
              if (rows.length === 0) return null;
              return (
                <Card key={t.id} className="overflow-hidden">
                  <h2 className="border-b border-line bg-surface-2 px-4 py-2.5 font-sans text-[14px] font-semibold tracking-normal">
                    {t.title}
                  </h2>
                  <ul>
                    {rows.map((s) => (
                      <LessonRow key={s.subtopicId} row={s} />
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="px-4 py-3">
      <div className={cn('font-display text-[26px] font-bold', tone)}>{value}</div>
      <div className="text-[12.5px] text-muted">{label}</div>
    </Card>
  );
}

function LessonRow({ row }: { row: LessonIndexRow }) {
  const Icon = row.working ? PencilLine : row.published ? Eye : CircleDashed;
  return (
    <li className="border-b border-line last:border-0">
      <Link
        to={`/lessons/${row.subtopicId}`}
        className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-surface-2"
      >
        <Icon className="size-4 shrink-0 text-muted" aria-hidden />
        <div className="min-w-[12rem] flex-1">
          <div className="font-semibold">{row.title}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {row.targets.length === 0 && (
              <span className="text-[12px] text-muted">Not in any published curriculum yet</span>
            )}
            {row.targets.map((t) => (
              <span
                key={`${t.roleId}-${t.bracketId}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11.5px] text-ink-2"
              >
                <span
                  className="rounded px-1 font-mono text-[10px] font-bold"
                  style={tint(t.colorKey)}
                >
                  {t.roleShortCode}
                </span>
                {t.bracketLabel} · {t.depth.name}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {row.published ? (
            <Badge tone="live" dot>
              Live v{row.published.versionNumber} · {row.published.sections} sections
            </Badge>
          ) : (
            !row.working && <Badge tone="planned">No lesson yet</Badge>
          )}
          {row.working && (
            <Badge tone={STATUS[row.working.status].tone}>
              v{row.working.versionNumber} {STATUS[row.working.status].label}
            </Badge>
          )}
          {row.working && (
            <span className="text-[12px] text-muted">{timeAgo(row.working.updatedAt)}</span>
          )}
        </div>
        <ArrowRight className="size-4 text-muted" aria-hidden />
      </Link>
    </li>
  );
}
