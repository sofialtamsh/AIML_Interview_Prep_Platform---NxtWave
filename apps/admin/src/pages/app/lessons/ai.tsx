import { STYLES } from '@app/content';
import type {
  AgentJobDto,
  AiStatusResponse,
  GenerateLessonBody,
  LessonVersionResponse,
  RewritePreset,
  StyleKey,
} from '@app/contracts';
import { Alert, Badge, Button, Chip, cn, Dialog, errorMessage, TextArea } from '@app/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronDown, CircleX, Loader2, Sparkles, Square, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { timeAgo } from '../../../components/table';
import { api } from '../../../lib/api';

export const aiKeys = {
  status: ['admin', 'ai', 'status'] as const,
  jobs: (subtopicId: string) => ['admin', 'ai', 'jobs', subtopicId] as const,
  evaluation: (versionId: string) => ['admin', 'lesson-evaluation', versionId] as const,
};

export const isActiveJob = (j: Pick<AgentJobDto, 'status'>) =>
  j.status === 'QUEUED' || j.status === 'RUNNING';

export function useAiStatus() {
  return useQuery({
    queryKey: aiKeys.status,
    queryFn: () => api.get<AiStatusResponse>('/ai/status'),
    staleTime: 60_000,
  });
}

/** AI jobs for one lesson; polls while any of them is running. */
export function useLessonJobs(subtopicId: string) {
  return useQuery({
    queryKey: aiKeys.jobs(subtopicId),
    queryFn: () => api.get<{ jobs: AgentJobDto[] }>(`/ai/jobs?subtopicId=${subtopicId}&limit=15`),
    refetchInterval: (q) => (q.state.data?.jobs.some(isActiveJob) ? 1500 : false),
    refetchOnWindowFocus: false,
  });
}

const JOB_LABEL: Record<AgentJobDto['type'], string> = {
  LESSON_GENERATION: 'Writing the lesson',
  LESSON_EVALUATION: 'AI review',
  SECTION_REWRITE: 'Rewriting a step',
};

// ───────────── Generate ─────────────

const STYLE_ORDER: StyleKey[] = ['genz', 'standard', 'deep'];

export function GenerateDialog({
  open,
  onClose,
  subtopicId,
  onStarted,
}: {
  open: boolean;
  onClose: () => void;
  subtopicId: string;
  onStarted: (job: AgentJobDto) => void;
}) {
  const [style, setStyle] = useState<StyleKey>('genz');
  const [instructions, setInstructions] = useState('');
  const status = useAiStatus();
  const start = useMutation({
    mutationFn: () =>
      api.post<AgentJobDto>(`/content/lessons/${subtopicId}/generate`, {
        style,
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
      } satisfies GenerateLessonBody),
    onSuccess: (job) => {
      onStarted(job);
      onClose();
    },
  });
  const provider = status.data?.provider;

  return (
    <Dialog open={open} onClose={onClose} title="Write this lesson with AI" wide>
      <div className="grid gap-5">
        <p className="text-[13.5px] text-ink-2">
          The AI plans the lesson for every package that uses this subtopic, writes each step, runs
          every piece of code (so outputs are real), then reviews its own draft. You get an{' '}
          <b>AI draft</b> to check, fix and approve. Nothing reaches students until someone
          publishes it.
        </p>
        <fieldset className="grid gap-2 sm:grid-cols-3">
          <legend className="mb-2 text-[13px] font-semibold">Style</legend>
          {STYLE_ORDER.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={style === k}
              onClick={() => setStyle(k)}
              className={cn(
                'grid gap-1 rounded-xl border p-3 text-left transition',
                style === k ? 'border-brand bg-brand-soft' : 'border-line hover:border-line-2',
              )}
            >
              <span className="flex items-center gap-1.5 text-[14px] font-semibold">
                {k === 'genz' && <Sparkles className="size-3.5 text-brand" aria-hidden />}
                {STYLES[k].label}
                {k === 'genz' && <Badge tone="next">Default</Badge>}
              </span>
              <span className="text-[12px] text-ink-2">{STYLES[k].summary}</span>
              <span className="font-mono text-[10.5px] text-muted">
                ≤ {STYLES[k].budgets.cardWords} words per card · ≤ {STYLES[k].budgets.sentenceWords}{' '}
                per sentence
              </span>
            </button>
          ))}
        </fieldset>
        <TextArea
          label="Anything specific? (optional)"
          hint='e.g. "Use a cricket or IPL example", "Show pandas, not plain Python", "Keep the 3–6 LPA view very light"'
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={3}
          maxLength={2000}
        />
        {provider === 'simulated' && (
          <Alert tone="warn">
            Simulated AI: this produces placeholder content to try the workflow. Add an AI key for
            real lessons.
          </Alert>
        )}
        {status.data && (
          <p className="text-[12px] text-muted">
            Runs on {status.data.routes.find((r) => r.task === 'LESSON_DRAFT')?.model} · usually a
            few minutes · stops automatically above ${status.data.budgetUsd.toFixed(2)}.
          </p>
        )}
        {start.isError && <Alert tone="bad">{errorMessage(start.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => start.mutate()} loading={start.isPending}>
            <Wand2 className="size-4" aria-hidden /> Write the lesson
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ───────────── Rewrite one step ─────────────

const PRESETS: Array<{ key: RewritePreset; label: string }> = [
  { key: 'shorter', label: '✂️ Shorter' },
  { key: 'simpler', label: '🧩 Simpler words' },
  { key: 'genz', label: '✨ More Gen Z' },
  { key: 'analogy', label: '🔁 Add an analogy' },
  { key: 'example', label: '📍 Add an example' },
  { key: 'interactive', label: '🎛️ Make it interactive' },
  { key: 'fix', label: '🛠️ Fix review notes' },
];

export interface RewriteTarget {
  sectionKey: string;
  title: string;
  presets?: RewritePreset[];
  instruction?: string;
}

export function RewriteDialog({
  target,
  v,
  onClose,
  onStarted,
}: {
  target: RewriteTarget | null;
  v: LessonVersionResponse;
  onClose: () => void;
  onStarted: (job: AgentJobDto) => void;
}) {
  return (
    <Dialog
      open={target !== null}
      onClose={onClose}
      title={target ? `Rewrite "${target.title}" with AI` : 'Rewrite with AI'}
    >
      {target && (
        <RewriteForm
          key={target.sectionKey}
          target={target}
          v={v}
          onClose={onClose}
          onStarted={onStarted}
        />
      )}
    </Dialog>
  );
}

function RewriteForm({
  target,
  v,
  onClose,
  onStarted,
}: {
  target: RewriteTarget;
  v: LessonVersionResponse;
  onClose: () => void;
  onStarted: (job: AgentJobDto) => void;
}) {
  const [presets, setPresets] = useState<RewritePreset[]>(target.presets ?? []);
  const [instruction, setInstruction] = useState(target.instruction ?? '');
  const revisionId = v.sections.find((s) => s.key === target.sectionKey)?.revisionId;
  const start = useMutation({
    mutationFn: () =>
      api.post<AgentJobDto>(
        `/content/versions/${v.version.id}/sections/${target.sectionKey}/rewrite`,
        { presets, revisionId, ...(instruction.trim() ? { instruction: instruction.trim() } : {}) },
      ),
    onSuccess: (job) => {
      onStarted(job);
      onClose();
    },
  });
  const toggle = (k: RewritePreset) =>
    setPresets(presets.includes(k) ? presets.filter((p) => p !== k) : [...presets, k]);
  return (
    <div className="grid gap-4">
      <p className="text-[13px] text-ink-2">
        Only this step changes. Every other step keeps its current version, and you can undo the
        rewrite in one click.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <Chip key={p.key} selected={presets.includes(p.key)} onClick={() => toggle(p.key)}>
            {p.label}
          </Chip>
        ))}
      </div>
      <TextArea
        label="Or say what to change"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder='e.g. "Swap the example for a Swiggy delivery-time one"'
      />
      {start.isError && <Alert tone="bad">{errorMessage(start.error)}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => start.mutate()}
          loading={start.isPending}
          disabled={presets.length === 0 && !instruction.trim()}
        >
          <Wand2 className="size-4" aria-hidden /> Rewrite this step
        </Button>
      </div>
    </div>
  );
}

// ───────────── Jobs ─────────────

export function JobCard({ job, title }: { job: AgentJobDto; title?: string }) {
  const [showLog, setShowLog] = useState(false);
  const cancel = useMutation({
    mutationFn: () => api.post<AgentJobDto>(`/ai/jobs/${job.id}/cancel`),
  });
  const active = isActiveJob(job);
  const detail = useQuery({
    queryKey: ['admin', 'ai', 'job', job.id],
    queryFn: () => api.get<AgentJobDto>(`/ai/jobs/${job.id}`),
    enabled: showLog,
    refetchInterval: showLog && active ? 1500 : false,
  });
  const logs = detail.data?.logs ?? [];
  return (
    <div
      className={cn(
        'grid gap-2.5 rounded-xl border p-3.5',
        job.status === 'FAILED'
          ? 'border-bad/40 bg-bad-bg'
          : active
            ? 'border-brand/30 bg-brand-soft/60'
            : 'border-line bg-surface',
      )}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[13.5px] font-semibold">
          {active ? (
            <Loader2 className="size-4 animate-spin text-brand" aria-hidden />
          ) : job.status === 'FAILED' ? (
            <CircleX className="size-4 text-bad" aria-hidden />
          ) : (
            <Sparkles className="size-4 text-brand" aria-hidden />
          )}
          {title ?? JOB_LABEL[job.type]}
          {job.sectionKey && (
            <code className="font-mono text-[11.5px] text-muted">{job.sectionKey}</code>
          )}
        </span>
        <span className="flex items-center gap-3 text-[12px] text-muted">
          <span>
            ${job.costUsd.toFixed(3)} · {timeAgo(job.createdAt)}
          </span>
          {active && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => cancel.mutate()}
              loading={cancel.isPending}
            >
              <Square className="size-3" aria-hidden /> Stop
            </Button>
          )}
        </span>
      </div>
      {active && (
        <div className="grid gap-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-700"
              style={{ width: `${Math.max(4, job.progress)}%` }}
            />
          </div>
          <span className="text-[12.5px] text-ink-2">{job.stage ?? 'Waiting to start'}</span>
        </div>
      )}
      {job.status === 'FAILED' && job.error && <p className="text-[13px] text-ink">{job.error}</p>}
      {job.status === 'CANCELLED' && <p className="text-[13px] text-ink-2">Stopped.</p>}
      <button
        type="button"
        onClick={() => setShowLog((s) => !s)}
        aria-expanded={showLog}
        className="inline-flex w-fit items-center gap-1 text-[12px] font-medium text-ink-2 hover:text-ink"
      >
        <ChevronDown className={cn('size-3.5 transition', showLog && 'rotate-180')} aria-hidden />
        {showLog ? 'Hide' : 'Show'} the log
      </button>
      {showLog && (
        <ol className="max-h-56 overflow-auto rounded-lg bg-surface px-3 py-2 font-mono text-[11.5px] leading-relaxed">
          {logs.map((l) => (
            <li
              key={`${l.createdAt}-${l.message}`}
              className={cn(
                l.level === 'error' ? 'text-bad' : l.level === 'warn' ? 'text-warn' : 'text-ink-2',
              )}
            >
              {new Date(l.createdAt).toLocaleTimeString('en-IN')} {l.message}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function AiOffNotice({ status }: { status: AiStatusResponse | undefined }) {
  if (!status || status.provider) return null;
  return (
    <Alert tone="info">
      AI writing is off. To switch it on, add <code className="font-mono">ANTHROPIC_API_KEY</code>{' '}
      to the server <code className="font-mono">.env</code> and restart the API and worker. The key
      stays on the server.
    </Alert>
  );
}
