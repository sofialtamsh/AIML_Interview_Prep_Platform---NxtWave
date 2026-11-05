import { STYLES } from '@app/content';
import type { EvaluationDto, EvaluationResponse, LessonVersionResponse } from '@app/contracts';
import { sectionTitle } from '@app/learning-ui';
import {
  Alert,
  Badge,
  type BadgeTone,
  Button,
  Card,
  cn,
  EmptyState,
  errorMessage,
  Spinner,
} from '@app/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, CircleAlert, CircleX, RefreshCw, Wand2 } from 'lucide-react';
import { timeAgo } from '../../../components/table';
import { api, queryClient } from '../../../lib/api';
import { aiKeys, isActiveJob, JobCard, type RewriteTarget } from './ai';

const VERDICT: Record<EvaluationDto['verdict'], { label: string; tone: BadgeTone; help: string }> =
  {
    READY_FOR_REVIEW: {
      label: 'Ready for human review',
      tone: 'ok',
      help: 'No major problems found. Read it as a student would, then approve or ask for changes.',
    },
    NEEDS_CHANGES: {
      label: 'Needs changes',
      tone: 'warn',
      help: 'Fix the major issues below (one click each) before submitting it for review.',
    },
    BLOCKING_ISSUES: {
      label: 'Blocking issues',
      tone: 'bad',
      help: 'Something is wrong or broken (often code that fails or a wrong answer key). Fix these first.',
    },
  };

const DIMENSION_LABEL: Record<EvaluationDto['scores'][number]['dimension'], string> = {
  correctness: 'Correctness',
  depth_fit: 'Depth per package',
  objective_alignment: 'Covers the objectives',
  style: 'Style and readability',
  code_quality: 'Code',
  prerequisites: 'Builds on what they know',
  redundancy: 'No repetition',
  hallucination_risk: 'No made-up claims',
  interview_relevance: 'Interview relevance',
};

const SEVERITY: Record<'blocking' | 'major' | 'minor', BadgeTone> = {
  blocking: 'bad',
  major: 'warn',
  minor: 'neutral',
};

export function AiReviewTab({
  v,
  aiOn,
  onFix,
}: {
  v: LessonVersionResponse;
  aiOn: boolean;
  onFix: ((t: RewriteTarget) => void) | null;
}) {
  const q = useQuery({
    queryKey: aiKeys.evaluation(v.version.id),
    queryFn: () => api.get<EvaluationResponse>(`/content/versions/${v.version.id}/evaluation`),
    refetchInterval: (query) =>
      query.state.data?.job && isActiveJob(query.state.data.job) ? 1500 : false,
  });
  const run = useMutation({
    mutationFn: () => api.post(`/content/versions/${v.version.id}/evaluate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: aiKeys.evaluation(v.version.id) }),
  });
  const title = new Map(v.document.sections.map((s) => [s.key, sectionTitle(s)]));

  if (q.isPending) return <Spinner />;
  if (q.isError) return <Alert tone="bad">{errorMessage(q.error)}</Alert>;
  const { evaluation: e, job } = q.data;
  const running = job !== null && isActiveJob(job);

  const rerun = (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => run.mutate()}
      loading={run.isPending}
      disabled={!aiOn || running}
      title={!aiOn ? 'AI is switched off' : undefined}
    >
      <RefreshCw className="size-3.5" aria-hidden /> {e ? 'Review again' : 'Run the AI review'}
    </Button>
  );

  return (
    <div className="grid gap-5">
      {running && job && <JobCard job={job} />}
      {run.isError && <Alert tone="bad">{errorMessage(run.error)}</Alert>}
      {!e ? (
        <Card>
          <EmptyState title="No AI review yet">
            <p>
              The AI reviewer runs every piece of code, measures readability against the lesson's
              style, and scores correctness, depth per package and more. It points at problems; you
              decide.
            </p>
            <div className="mt-3">{rerun}</div>
          </EmptyState>
        </Card>
      ) : (
        <>
          <Card className="grid gap-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={VERDICT[e.verdict].tone}>{VERDICT[e.verdict].label}</Badge>
                  <span className="font-display text-[22px] font-bold">
                    {e.overall.toFixed(1)}
                    <span className="text-[13px] font-medium text-muted"> / 5</span>
                  </span>
                </div>
                <p className="text-[13.5px] text-ink-2">{VERDICT[e.verdict].help}</p>
                <span className="text-[12px] text-muted">
                  {e.model} · {timeAgo(e.createdAt)} · checked against{' '}
                  {STYLES[e.metrics.style].label}
                </span>
              </div>
              {rerun}
            </div>
            <p className="text-[14px]">{e.summary}</p>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section className="grid content-start gap-2">
              <h2 className="text-base">Issues ({e.issues.length})</h2>
              {e.issues.length === 0 && <p className="text-[13px] text-muted">Nothing to fix.</p>}
              <ol className="grid gap-2">
                {e.issues.map((i) => (
                  <li
                    key={`${i.sectionKey}-${i.dimension}-${i.problem.slice(0, 48)}`}
                    className="grid gap-1.5 rounded-xl border border-line bg-surface p-3.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={SEVERITY[i.severity]}>{i.severity}</Badge>
                      <span className="text-[13px] font-semibold">
                        {i.sectionKey === 'lesson'
                          ? 'Whole lesson'
                          : (title.get(i.sectionKey) ?? i.sectionKey)}
                      </span>
                      <span className="text-[11.5px] text-muted">
                        {DIMENSION_LABEL[i.dimension]} ·{' '}
                        {i.source === 'check' ? 'found by running the code' : 'AI reviewer'}
                      </span>
                    </div>
                    <p className="text-[13.5px] text-ink">{i.problem}</p>
                    <p className="text-[13px] text-ink-2">
                      <b>Fix:</b> {i.suggestion}
                    </p>
                    {onFix && i.sectionKey !== 'lesson' && title.has(i.sectionKey) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-fit"
                        onClick={() =>
                          onFix({
                            sectionKey: i.sectionKey,
                            title: title.get(i.sectionKey) ?? i.sectionKey,
                            presets: ['fix'],
                            instruction: `${i.problem} ${i.suggestion}`,
                          })
                        }
                      >
                        <Wand2 className="size-3.5" aria-hidden /> Fix with AI
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            <aside className="grid content-start gap-4">
              <Card className="grid gap-2 p-4">
                <span className="eyebrow">Scores</span>
                {e.scores.map((s) => (
                  <div key={s.dimension} className="grid gap-1" title={s.reason}>
                    <div className="flex justify-between text-[12.5px]">
                      <span>{DIMENSION_LABEL[s.dimension]}</span>
                      <span className="font-mono font-semibold">{s.score}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          s.score >= 4 ? 'bg-ok' : s.score === 3 ? 'bg-warn' : 'bg-bad',
                        )}
                        style={{ width: `${(s.score / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </Card>
              <Card className="grid gap-2 p-4">
                <span className="eyebrow">Code, run for real</span>
                {e.metrics.codeChecks.length === 0 && (
                  <span className="text-[12.5px] text-muted">No runnable code in this lesson.</span>
                )}
                {e.metrics.codeChecks.map((c) => (
                  <div key={`${c.sectionKey}-${c.target}`} className="flex gap-2 text-[12.5px]">
                    {c.status === 'ok' ? (
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-ok" aria-hidden />
                    ) : c.status === 'warning' ? (
                      <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" aria-hidden />
                    ) : (
                      <CircleX className="mt-0.5 size-3.5 shrink-0 text-bad" aria-hidden />
                    )}
                    <span>
                      <b>{title.get(c.sectionKey) ?? c.sectionKey}</b> · {c.target}: {c.message}
                    </span>
                  </div>
                ))}
              </Card>
            </aside>
          </div>

          <section className="grid gap-2">
            <h2 className="text-base">Readability ({STYLES[e.metrics.style].label})</h2>
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[12.5px]">
                <thead>
                  <tr className="text-left font-mono text-[10.5px] tracking-wider text-muted uppercase">
                    <th className="border-b border-line px-3 py-2">Step</th>
                    <th className="border-b border-line px-3 py-2">Words</th>
                    <th className="border-b border-line px-3 py-2">Avg sentence</th>
                    <th className="border-b border-line px-3 py-2">Longest</th>
                    <th className="border-b border-line px-3 py-2">Over budget</th>
                  </tr>
                </thead>
                <tbody>
                  {e.metrics.readability.map((r) => {
                    const over = e.metrics.styleIssues.filter((x) => x.sectionKey === r.sectionKey);
                    return (
                      <tr
                        key={r.sectionKey}
                        className="border-b border-line align-top last:border-0"
                      >
                        <td className="px-3 py-2 font-medium">
                          {title.get(r.sectionKey) ?? r.sectionKey}
                        </td>
                        <td className="px-3 py-2 font-mono">{r.words}</td>
                        <td className="px-3 py-2 font-mono">{r.avgSentenceWords}</td>
                        <td className="px-3 py-2 font-mono">{r.longestSentenceWords}</td>
                        <td className="px-3 py-2">
                          {over.length === 0 ? (
                            <span className="text-ok">✓</span>
                          ) : (
                            <ul className="grid gap-0.5 text-ink-2">
                              {over.map((o) => (
                                <li key={o.rule}>{o.message}</li>
                              ))}
                            </ul>
                          )}
                          {over.length > 0 && onFix && (
                            <button
                              type="button"
                              className="mt-1 text-[12px] font-semibold text-brand hover:underline"
                              onClick={() =>
                                onFix({
                                  sectionKey: r.sectionKey,
                                  title: title.get(r.sectionKey) ?? r.sectionKey,
                                  presets: ['shorter', 'simpler'],
                                })
                              }
                            >
                              Shorten with AI
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
