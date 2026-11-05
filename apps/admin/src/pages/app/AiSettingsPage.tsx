import type { AiStatusResponse } from '@app/contracts';
import { Alert, Badge, Button, Card, errorMessage, SelectField, Spinner, TextField } from '@app/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { KeyRound, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { PageHeader, timeAgo } from '../../components/table';
import { api, queryClient, useAdminMe } from '../../lib/api';
import { aiKeys } from './lessons/ai';

const TASK_LABEL: Record<
  AiStatusResponse['routes'][number]['task'],
  { label: string; help: string }
> = {
  LESSON_PLAN: { label: 'Plan a lesson', help: 'Outline, depth layers and objectives' },
  LESSON_DRAFT: { label: 'Write the steps', help: 'The bulk of the tokens' },
  LESSON_EVALUATION: {
    label: 'Review a lesson',
    help: 'Ideally a different model than the writer',
  },
  SECTION_REWRITE: { label: 'Rewrite one step', help: 'Shorter, simpler, more Gen Z…' },
};

const STATUS_TONE = {
  QUEUED: 'neutral',
  RUNNING: 'next',
  SUCCEEDED: 'ok',
  FAILED: 'bad',
  CANCELLED: 'planned',
} as const;

export function AiSettingsPage() {
  const status = useQuery({
    queryKey: aiKeys.status,
    queryFn: () => api.get<AiStatusResponse>('/ai/status'),
  });
  const { data: me } = useAdminMe();
  const canEdit = me?.role === 'SUPER_ADMIN';

  return (
    <div className="grid gap-5 animate-rise">
      <PageHeader
        eyebrow="Content"
        title="AI"
        sub="The AI writes and reviews lesson drafts for your team. It runs only when an admin asks, never touches student data, and never publishes anything by itself."
      />
      {status.isPending && <Spinner />}
      {status.isError && <Alert tone="bad">{errorMessage(status.error)}</Alert>}
      {status.data && (
        <>
          <ProviderCard s={status.data} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {status.data.usage.map((u) => (
              <Card key={u.period} className="grid gap-1 px-4 py-3">
                <span className="eyebrow">
                  {u.period === 'today'
                    ? 'Today'
                    : u.period === '7d'
                      ? 'Last 7 days'
                      : 'Last 30 days'}
                </span>
                <span className="font-display text-[24px] font-bold">${u.costUsd.toFixed(2)}</span>
                <span className="text-[12px] text-muted">
                  {u.calls} calls · {(u.inputTokens / 1000).toFixed(0)}k in ·{' '}
                  {(u.outputTokens / 1000).toFixed(0)}k out
                  {u.failed > 0 && ` · ${u.failed} failed`}
                </span>
              </Card>
            ))}
          </div>

          <section className="grid gap-2">
            <h2 className="text-base">Which model does what</h2>
            <p className="-mt-1 text-[13px] text-muted">
              Effort sets how hard the model thinks: higher is better and slower and costs more.
              {!canEdit && ' Only super admins can change these.'}
            </p>
            <Card className="divide-y divide-line">
              {status.data.routes.map((r) => (
                <RouteRow key={r.task} route={r} models={status.data.models} canEdit={canEdit} />
              ))}
            </Card>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="grid content-start gap-2">
              <h2 className="text-base">Recent AI jobs</h2>
              <Card className="divide-y divide-line">
                {status.data.recentJobs.length === 0 && (
                  <p className="px-4 py-3 text-[13px] text-muted">No AI jobs yet.</p>
                )}
                {status.data.recentJobs.map((j) => (
                  <div
                    key={j.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[13px]"
                  >
                    <span className="flex items-center gap-2">
                      <Badge tone={STATUS_TONE[j.status]}>{j.status.toLowerCase()}</Badge>
                      {j.type === 'LESSON_GENERATION'
                        ? 'Lesson draft'
                        : j.type === 'LESSON_EVALUATION'
                          ? 'AI review'
                          : `Rewrite ${j.sectionKey ?? ''}`}
                      {j.subtopicId && (
                        <Link
                          to={`/lessons/${j.subtopicId}`}
                          className="font-medium text-brand hover:underline"
                        >
                          open
                        </Link>
                      )}
                    </span>
                    <span className="text-[12px] text-muted">
                      ${j.costUsd.toFixed(3)} · {timeAgo(j.createdAt)}
                    </span>
                  </div>
                ))}
              </Card>
            </section>
            <section className="grid content-start gap-2">
              <h2 className="text-base">Spend by task (30 days)</h2>
              <Card className="divide-y divide-line">
                {status.data.byTask.length === 0 && (
                  <p className="px-4 py-3 text-[13px] text-muted">Nothing yet.</p>
                )}
                {status.data.byTask.map((t) => (
                  <div key={t.task} className="flex justify-between px-4 py-2.5 text-[13px]">
                    <span>{TASK_LABEL[t.task as keyof typeof TASK_LABEL]?.label ?? t.task}</span>
                    <span className="font-mono">
                      {t.calls} calls · ${t.costUsd.toFixed(3)}
                    </span>
                  </div>
                ))}
              </Card>
              <h2 className="mt-3 text-base">Prices used for estimates (USD per 1M tokens)</h2>
              <Card className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-[12.5px]">
                  <thead>
                    <tr className="text-left font-mono text-[10.5px] tracking-wider text-muted uppercase">
                      <th className="border-b border-line px-3 py-2">Model</th>
                      <th className="border-b border-line px-3 py-2">In</th>
                      <th className="border-b border-line px-3 py-2">Out</th>
                      <th className="border-b border-line px-3 py-2">Cache read</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.data.pricing
                      .filter((p) => p.model !== 'simulated')
                      .map((p) => (
                        <tr key={p.model} className="border-b border-line last:border-0">
                          <td className="px-3 py-1.5 font-mono">{p.model}</td>
                          <td className="px-3 py-1.5 font-mono">{p.inputPerMTok}</td>
                          <td className="px-3 py-1.5 font-mono">{p.outputPerMTok}</td>
                          <td className="px-3 py-1.5 font-mono">{p.cacheReadPerMTok}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </Card>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function ProviderCard({ s }: { s: AiStatusResponse }) {
  return (
    <Card className="flex flex-wrap items-start gap-4 p-4 sm:p-5">
      <span className="grid size-11 place-items-center rounded-xl bg-ink text-surface">
        {s.provider ? (
          <Sparkles className="size-5" aria-hidden />
        ) : (
          <KeyRound className="size-5" aria-hidden />
        )}
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[16px]">
            {s.provider === 'anthropic'
              ? 'Claude (Anthropic)'
              : s.provider === 'simulated'
                ? 'Simulated AI'
                : 'AI is off'}
          </h2>
          <Badge
            tone={
              s.provider === 'anthropic' ? 'live' : s.provider === 'simulated' ? 'warn' : 'planned'
            }
            dot
          >
            {s.provider === 'anthropic'
              ? 'Connected'
              : s.provider === 'simulated'
                ? 'Demo only'
                : 'No key'}
          </Badge>
        </div>
        {s.provider === 'anthropic' && (
          <p className="text-[13.5px] text-ink-2">
            The API key is set on the server ({'ANTHROPIC_API_KEY'}). It is never shown here or sent
            to a browser.
          </p>
        )}
        {s.provider === 'simulated' && (
          <p className="text-[13.5px] text-ink-2">
            Produces placeholder lessons so you can try the workflow. Add an API key for real
            content.
          </p>
        )}
        {!s.provider && (
          <p className="text-[13.5px] text-ink-2">
            Add <code className="font-mono">ANTHROPIC_API_KEY=…</code> to the server{' '}
            <code className="font-mono">.env</code> file, then restart the API and the worker. Paste
            the key into the file, never into chat or a ticket.
          </p>
        )}
        <p className="text-[12.5px] text-muted">
          Each AI job stops automatically before it spends more than ${s.budgetUsd.toFixed(2)}{' '}
          (AI_JOB_BUDGET_USD).
        </p>
      </div>
    </Card>
  );
}

function RouteRow({
  route,
  models,
  canEdit,
}: {
  route: AiStatusResponse['routes'][number];
  models: string[];
  canEdit: boolean;
}) {
  const [model, setModel] = useState(route.model);
  const [effort, setEffort] = useState(route.effort);
  const [maxTokens, setMaxTokens] = useState(String(route.maxTokens));
  const save = useMutation({
    mutationFn: () =>
      api.put<AiStatusResponse>(`/ai/routes/${route.task}`, {
        model,
        effort,
        maxTokens: Number(maxTokens),
      }),
    onSuccess: (s) => queryClient.setQueryData(aiKeys.status, s),
  });
  const dirty =
    model !== route.model || effort !== route.effort || Number(maxTokens) !== route.maxTokens;
  const t = TASK_LABEL[route.task];
  return (
    <div className="grid items-end gap-3 px-4 py-3 md:grid-cols-[1.3fr_1.3fr_0.9fr_0.8fr_auto]">
      <div>
        <div className="text-[14px] font-semibold">{t.label}</div>
        <div className="text-[12px] text-muted">{t.help}</div>
      </div>
      <SelectField
        label="Model"
        value={model}
        disabled={!canEdit}
        onChange={(e) => setModel(e.target.value)}
        options={models.map((m) => ({ value: m, label: m }))}
      />
      <SelectField
        label="Effort"
        value={effort}
        disabled={!canEdit}
        onChange={(e) => setEffort(e.target.value as typeof effort)}
        options={['low', 'medium', 'high', 'xhigh', 'max'].map((x) => ({ value: x, label: x }))}
      />
      <TextField
        label="Max tokens"
        inputMode="numeric"
        value={maxTokens}
        disabled={!canEdit}
        onChange={(e) => setMaxTokens(e.target.value.replace(/\D/g, ''))}
      />
      {canEdit && (
        <Button size="sm" onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}>
          Save
        </Button>
      )}
      {save.isError && (
        <p className="text-[12.5px] text-bad md:col-span-5">{errorMessage(save.error)}</p>
      )}
    </div>
  );
}
