import type {
  AgentJobDto,
  ContentIssue,
  LessonModuleResponse,
  LessonVersionResponse,
  LessonVersionStatus,
  ReviewDecision,
} from '@app/contracts';
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  errorMessage,
  SelectField,
  Spinner,
  TextArea,
} from '@app/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  CopyPlus,
  FileUp,
  Send,
  ShieldCheck,
  Trash2,
  Undo2,
  Upload,
  Wand2,
} from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { RoleChip, Tabs, timeAgo } from '../../../components/table';
import { api, queryClient } from '../../../lib/api';
import { AiReviewTab } from './AiReviewTab';
import {
  AiOffNotice,
  aiKeys,
  GenerateDialog,
  isActiveJob,
  JobCard,
  RewriteDialog,
  type RewriteTarget,
  useAiStatus,
  useLessonJobs,
} from './ai';
import { CompareTab } from './CompareTab';
import { EditTab } from './EditTab';
import { FeedbackTab } from './FeedbackTab';
import { ImportDialog } from './ImportDialog';
import { PreviewTab } from './PreviewTab';
import { ReviewTab } from './ReviewTab';
import { issuesOf, lessonKeys, STATUS } from './shared';

const TABS = [
  { id: 'preview', label: 'Preview' },
  { id: 'compare', label: 'Compare packages' },
  { id: 'ai', label: 'AI review' },
  { id: 'edit', label: 'Edit' },
  { id: 'review', label: 'Checklist & history' },
  { id: 'feedback', label: 'Student feedback' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const STATUS_HELP: Record<LessonVersionStatus, string> = {
  DRAFT: 'A draft. Edit it, then submit it for review.',
  AI_GENERATED:
    'Written by AI and not reviewed yet. A person must review it before it can be published.',
  UNDER_REVIEW:
    'Waiting for review. Read it as a student would (Preview), check each package (Compare), add notes on any step, then decide.',
  APPROVED: 'Approved. Publish it to make it live for students.',
  PUBLISHED: 'Live. Students on the curricula below see this version, at their own depth.',
  SUPERSEDED: 'An earlier version, kept for history. You can restore it as a new draft.',
  ARCHIVED: 'Discarded or rejected, kept for history. You can restore it as a new draft.',
};

export function LessonWorkspace() {
  const { subtopicId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'preview') as TabId;
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [rewrite, setRewrite] = useState<RewriteTarget | null>(null);
  const [undo, setUndo] = useState<{ versionId: string; previous: unknown; title: string } | null>(
    null,
  );
  const [failed, setFailed] = useState<AgentJobDto[]>([]);
  const ai = useAiStatus();
  const aiOn = Boolean(ai.data?.provider);
  const jobs = useLessonJobs(subtopicId);
  const seen = useRef(new Map<string, string>());

  const module = useQuery({
    queryKey: lessonKeys.module(subtopicId),
    queryFn: () => api.get<LessonModuleResponse>(`/content/lessons/${subtopicId}`),
  });
  const m = module.data;
  const selectedId =
    params.get('v') ?? m?.workingVersionId ?? m?.publishedVersionId ?? m?.versions[0]?.id ?? null;
  const version = useQuery({
    queryKey: lessonKeys.version(selectedId ?? 'none'),
    queryFn: () => api.get<LessonVersionResponse>(`/content/versions/${selectedId}`),
    enabled: selectedId !== null,
    refetchOnWindowFocus: false,
  });

  const select = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
  };

  /** After any change: show the returned version and refresh the lists. */
  const applied = (v: LessonVersionResponse) => {
    queryClient.setQueryData(lessonKeys.version(v.version.id), v);
    void queryClient.invalidateQueries({ queryKey: lessonKeys.module(subtopicId) });
    void queryClient.invalidateQueries({ queryKey: lessonKeys.index });
    select({ v: v.version.id });
  };
  const created = async (id: string) => {
    await queryClient.invalidateQueries({ queryKey: lessonKeys.module(subtopicId) });
    void queryClient.invalidateQueries({ queryKey: lessonKeys.index });
    select({ v: id, tab: 'preview' });
    setNotes({});
  };

  // React when a job this page is following finishes: show the new draft, refresh the review,
  // offer an undo after a rewrite, and surface failures.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reacts to job list updates only
  useEffect(() => {
    for (const j of jobs.data?.jobs ?? []) {
      const before = seen.current.get(j.id);
      seen.current.set(j.id, j.status);
      if (before !== 'QUEUED' && before !== 'RUNNING') continue;
      if (isActiveJob(j)) continue;
      void queryClient.invalidateQueries({ queryKey: lessonKeys.module(subtopicId) });
      void queryClient.invalidateQueries({ queryKey: lessonKeys.index });
      if (j.moduleVersionId) {
        void queryClient.invalidateQueries({ queryKey: lessonKeys.version(j.moduleVersionId) });
        void queryClient.invalidateQueries({ queryKey: aiKeys.evaluation(j.moduleVersionId) });
      }
      if (j.status === 'FAILED')
        setFailed((f) => [j, ...f.filter((x) => x.id !== j.id)].slice(0, 2));
      if (j.status !== 'SUCCEEDED') continue;
      const out = j.output as { moduleVersionId?: string; previous?: { title?: string } } | null;
      if (j.type === 'LESSON_GENERATION' && out?.moduleVersionId) {
        select({ v: out.moduleVersionId, tab: 'preview' });
      }
      if (j.type === 'SECTION_REWRITE' && out?.previous && j.moduleVersionId) {
        setUndo({
          versionId: j.moduleVersionId,
          previous: out.previous,
          title: out.previous.title ?? j.sectionKey ?? 'the step',
        });
      }
    }
  }, [jobs.data]);

  const started = (job: AgentJobDto) => {
    seen.current.set(job.id, job.status);
    setFailed([]);
    void queryClient.invalidateQueries({ queryKey: aiKeys.jobs(subtopicId) });
  };
  const activeJobs = (jobs.data?.jobs ?? []).filter(isActiveJob);

  if (module.isPending) return <Spinner />;
  if (module.isError) return <Alert tone="bad">{errorMessage(module.error)}</Alert>;
  if (!m) return null;

  return (
    <div className="grid gap-5 animate-rise">
      <nav
        className="flex flex-wrap items-center gap-1 text-[13px] text-muted"
        aria-label="Breadcrumb"
      >
        <Link to="/lessons" className="hover:text-ink">
          Lessons
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span>{m.subtopic.topic.title}</span>
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="eyebrow">Lesson</span>
          <h1 className="mt-1 text-[clamp(22px,2.4vw,28px)]">{m.subtopic.title}</h1>
          <p className="mt-1 max-w-[70ch] text-sm text-muted">{m.subtopic.summary}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {m.targets.length === 0 && (
              <span className="text-[12.5px] text-muted">
                No published curriculum includes this subtopic yet.
              </span>
            )}
            {m.targets.map((t) => (
              <span
                key={`${t.roleId}-${t.bracketId}`}
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1 text-[12px]"
              >
                <RoleChip code={t.roleShortCode} color={t.colorKey} />
                <span>
                  <b>{t.bracketLabel}</b> · {t.depth.name} · roadmap budget {t.plannedMinutes} min
                </span>
              </span>
            ))}
          </div>
        </div>
        {m.versions.length > 0 && (
          <div className="w-full max-w-[16rem]">
            <SelectField
              label="Version"
              value={selectedId ?? ''}
              onChange={(e) => {
                select({ v: e.target.value });
                setNotes({});
              }}
              options={m.versions.map((v) => ({
                value: v.id,
                label: `v${v.versionNumber} · ${STATUS[v.status].label}${v.origin === 'AI' && v.status !== 'AI_GENERATED' ? ' (AI)' : ''}`,
              }))}
            />
          </div>
        )}
      </header>

      {(activeJobs.length > 0 || failed.length > 0) && (
        <div className="grid gap-2">
          {activeJobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
          {failed.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      )}
      {undo && version.data?.version.id === undo.versionId && (
        <UndoRewrite
          undo={undo}
          v={version.data}
          onDone={(v) => {
            setUndo(null);
            if (v) applied(v);
          }}
        />
      )}

      {m.versions.length === 0 ? (
        <Card className="dotgrid grid justify-items-center gap-3 px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-ink text-surface">
            <FileUp className="size-6" aria-hidden />
          </span>
          <h2 className="text-lg">No lesson yet</h2>
          <p className="max-w-md text-sm text-muted">
            Let AI write a first draft for every package that uses this subtopic (in Gen Z bites by
            default), or import a lesson written in the lesson JSON format. Either way it is a draft
            for your review.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => setGenerateOpen(true)}
              disabled={!aiOn || activeJobs.some((j) => j.type === 'LESSON_GENERATION')}
            >
              <Wand2 className="size-4" aria-hidden /> Write with AI
            </Button>
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <Upload className="size-4" aria-hidden /> Import lesson JSON
            </Button>
          </div>
          <div className="w-full max-w-lg text-left">
            <AiOffNotice status={ai.data} />
          </div>
        </Card>
      ) : version.isPending ? (
        <Spinner />
      ) : version.isError ? (
        <Alert tone="bad">{errorMessage(version.error)}</Alert>
      ) : (
        <>
          <ActionBar
            key={version.data.version.id}
            v={version.data}
            module={m}
            notes={notes}
            onApplied={applied}
            onCreated={created}
            onImport={() => setImportOpen(true)}
            onGenerate={
              aiOn && !activeJobs.some((j) => j.type === 'LESSON_GENERATION')
                ? () => setGenerateOpen(true)
                : null
            }
          />
          <Tabs tabs={TABS} value={tab} onChange={(id) => select({ tab: id })} />
          {tab === 'preview' && (
            <PreviewTab
              v={version.data}
              module={m}
              notes={version.data.version.status === 'UNDER_REVIEW' ? notes : null}
              onRewrite={
                aiOn && version.data.version.editable
                  ? (key, title) => setRewrite({ sectionKey: key, title })
                  : undefined
              }
              onNote={(key, text) =>
                setNotes((n) => {
                  const next = { ...n };
                  if (text.trim()) next[key] = text;
                  else delete next[key];
                  return next;
                })
              }
            />
          )}
          {tab === 'compare' && <CompareTab v={version.data} module={m} />}
          {tab === 'ai' && (
            <AiReviewTab
              v={version.data}
              aiOn={aiOn}
              onFix={aiOn && version.data.version.editable ? setRewrite : null}
            />
          )}
          {tab === 'edit' && (
            <EditTab
              v={version.data}
              module={m}
              onSaved={applied}
              onRewrite={
                aiOn && version.data.version.editable
                  ? (key, title) => setRewrite({ sectionKey: key, title })
                  : undefined
              }
            />
          )}
          {tab === 'review' && <ReviewTab v={version.data} module={m} />}
          {tab === 'feedback' && <FeedbackTab subtopicId={subtopicId} v={version.data} />}
          <RewriteDialog
            target={rewrite}
            v={version.data}
            onClose={() => setRewrite(null)}
            onStarted={started}
          />
        </>
      )}

      <GenerateDialog
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        subtopicId={subtopicId}
        onStarted={started}
      />

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        subtopicId={subtopicId}
        onCreated={(id) => {
          setImportOpen(false);
          void created(id);
        }}
      />
    </div>
  );
}

// ───────────── Status and actions ─────────────

function ActionBar({
  v,
  module,
  notes,
  onApplied,
  onCreated,
  onImport,
  onGenerate,
}: {
  v: LessonVersionResponse;
  module: LessonModuleResponse;
  notes: Record<string, string>;
  onApplied: (v: LessonVersionResponse) => void;
  onCreated: (id: string) => void;
  onImport: () => void;
  /** Null when AI is off or already writing. */
  onGenerate: (() => void) | null;
}) {
  const s = v.version.status;
  const id = v.version.id;
  const [dialog, setDialog] = useState<
    null | 'submit' | 'review' | 'publish' | 'discard' | 'unpublish'
  >(null);
  const [error, setError] = useState<string | null>(null);
  const hasWorking = module.workingVersionId !== null && module.workingVersionId !== id;

  const copy = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>(`/content/lessons/${module.subtopic.id}/versions`, {
        source: 'COPY',
        versionId: id,
      }),
    onSuccess: (r) => onCreated(r.id),
    onError: (e) => setError(errorMessage(e)),
  });
  const simple = useMutation({
    mutationFn: (action: 'discard' | 'unpublish') =>
      api.post<LessonVersionResponse>(`/content/versions/${id}/${action}`),
    onSuccess: (r) => {
      setDialog(null);
      onApplied(r);
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const changes = v.sections.filter((x) => x.change !== 'UNCHANGED').length + v.removedKeys.length;

  return (
    <Card className="grid gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS[s].tone} dot={s === 'PUBLISHED'}>
              v{v.version.versionNumber} · {STATUS[s].label}
            </Badge>
            <span className="text-[12.5px] text-muted">
              {v.version.origin === 'IMPORT'
                ? 'Imported'
                : v.version.origin === 'AI'
                  ? 'AI-generated'
                  : 'Edited'}
              {v.version.createdBy ? ` by ${v.version.createdBy}` : ''} · updated{' '}
              {timeAgo(v.version.updatedAt)}
              {v.version.basedOnVersionNumber
                ? ` · based on v${v.version.basedOnVersionNumber}`
                : ''}
              {module.publishedVersionId &&
                module.publishedVersionId !== id &&
                ` · ${changes} changes vs live`}
            </span>
          </div>
          <p className="text-[13.5px] text-ink-2">{STATUS_HELP[s]}</p>
          {v.version.changeNote && (
            <p className="text-[12.5px] text-muted">Note: {v.version.changeNote}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(s === 'DRAFT' || s === 'AI_GENERATED') && (
            <>
              <Button size="sm" onClick={() => setDialog('submit')}>
                <Send className="size-3.5" aria-hidden /> Submit for review
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDialog('discard')}>
                <Trash2 className="size-3.5" aria-hidden /> Discard
              </Button>
            </>
          )}
          {s === 'UNDER_REVIEW' && (
            <Button size="sm" onClick={() => setDialog('review')}>
              <ShieldCheck className="size-3.5" aria-hidden /> Review
              {Object.keys(notes).length > 0 && ` (${Object.keys(notes).length} notes)`}
            </Button>
          )}
          {s === 'APPROVED' && (
            <>
              <Button size="sm" onClick={() => setDialog('publish')}>
                Publish to students
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDialog('discard')}>
                Discard
              </Button>
            </>
          )}
          {(s === 'PUBLISHED' || s === 'SUPERSEDED' || s === 'ARCHIVED') && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => copy.mutate()}
              loading={copy.isPending}
              disabled={hasWorking}
              title={hasWorking ? 'Finish or discard the current draft first' : undefined}
            >
              {s === 'PUBLISHED' ? (
                <CopyPlus className="size-3.5" aria-hidden />
              ) : (
                <Undo2 className="size-3.5" aria-hidden />
              )}
              {s === 'PUBLISHED' ? 'Start a new draft' : 'Restore as a new draft'}
            </Button>
          )}
          {!module.workingVersionId && onGenerate && (
            <Button size="sm" variant="secondary" onClick={onGenerate}>
              <Wand2 className="size-3.5" aria-hidden /> Write a new draft with AI
            </Button>
          )}
          {!module.workingVersionId && (
            <Button size="sm" variant="ghost" onClick={onImport}>
              <Upload className="size-3.5" aria-hidden /> Import JSON
            </Button>
          )}
          {s === 'PUBLISHED' && (
            <Button size="sm" variant="ghost" onClick={() => setDialog('unpublish')}>
              Unpublish
            </Button>
          )}
        </div>
      </div>
      {hasWorking && s !== 'UNDER_REVIEW' && (
        <p className="text-[12.5px] text-muted">
          There is already a version in progress.{' '}
          <Link
            to={`?v=${module.workingVersionId}`}
            className="font-semibold text-brand hover:underline"
          >
            Open it
          </Link>
        </p>
      )}
      {error && <Alert tone="bad">{error}</Alert>}

      <SubmitDialog
        open={dialog === 'submit'}
        onClose={() => setDialog(null)}
        v={v}
        onDone={onApplied}
      />
      <ReviewDialog
        open={dialog === 'review'}
        onClose={() => setDialog(null)}
        v={v}
        notes={notes}
        onDone={onApplied}
      />
      <PublishDialog
        open={dialog === 'publish'}
        onClose={() => setDialog(null)}
        v={v}
        module={module}
        onDone={onApplied}
      />
      <Confirm
        open={dialog === 'discard' || dialog === 'unpublish'}
        onClose={() => setDialog(null)}
        title={dialog === 'unpublish' ? 'Unpublish this lesson?' : 'Discard this version?'}
        busy={simple.isPending}
        danger
        confirm={dialog === 'unpublish' ? 'Unpublish' : 'Discard'}
        onConfirm={() => simple.mutate(dialog === 'unpublish' ? 'unpublish' : 'discard')}
      >
        {dialog === 'unpublish'
          ? 'Students will see "coming soon" for this lesson until you publish a version again. Their progress is kept.'
          : 'The version is kept in history (archived) but can no longer be edited or published.'}
      </Confirm>
    </Card>
  );
}

function SubmitDialog({
  open,
  onClose,
  v,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  v: LessonVersionResponse;
  onDone: (v: LessonVersionResponse) => void;
}) {
  const [note, setNote] = useState(v.version.changeNote ?? '');
  const submit = useMutation({
    mutationFn: () =>
      api.post<LessonVersionResponse>(`/content/versions/${v.version.id}/submit`, {
        editSeq: v.version.editSeq,
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    onSuccess: (r) => {
      onClose();
      onDone(r);
    },
  });
  const failing = v.depthReports.flatMap((d) =>
    d.checks.filter((c) => !c.ok).map((c) => `Depth ${d.depth}: ${c.message}`),
  );
  return (
    <Dialog open={open} onClose={onClose} title="Submit for review">
      <div className="grid gap-4">
        <p className="text-sm text-ink-2">
          The draft locks while it is reviewed. A reviewer can approve it or send it back with
          notes.
        </p>
        {failing.length > 0 && (
          <Alert tone="warn">
            The checklist has {failing.length} open {failing.length === 1 ? 'point' : 'points'}:{' '}
            {failing.slice(0, 3).join(' · ')}
            {failing.length > 3 && ' …'}
          </Alert>
        )}
        <TextArea
          label="What changed? (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
        />
        {submit.isError && <Alert tone="bad">{errorMessage(submit.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => submit.mutate()} loading={submit.isPending}>
            Submit
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

const DECISIONS: Array<{ value: ReviewDecision; label: string; hint: string }> = [
  { value: 'APPROVED', label: 'Approve', hint: 'Ready to publish' },
  { value: 'CHANGES_REQUESTED', label: 'Request changes', hint: 'Back to draft with your notes' },
  { value: 'REJECTED', label: 'Reject', hint: 'Archive this version' },
];

function ReviewDialog({
  open,
  onClose,
  v,
  notes,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  v: LessonVersionResponse;
  notes: Record<string, string>;
  onDone: (v: LessonVersionResponse) => void;
}) {
  const [decision, setDecision] = useState<ReviewDecision>('APPROVED');
  const [text, setText] = useState('');
  const review = useMutation({
    mutationFn: () =>
      api.post<LessonVersionResponse>(`/content/versions/${v.version.id}/review`, {
        decision,
        ...(text.trim() ? { notes: text.trim() } : {}),
        sectionNotes: decision === 'APPROVED' ? {} : notes,
      }),
    onSuccess: (r) => {
      onClose();
      onDone(r);
    },
  });
  const noteCount = Object.keys(notes).length;
  return (
    <Dialog open={open} onClose={onClose} title={`Review v${v.version.versionNumber}`}>
      <div className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {DECISIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              aria-pressed={decision === d.value}
              onClick={() => setDecision(d.value)}
              className={`grid rounded-xl border px-3 py-2.5 text-left transition ${
                decision === d.value
                  ? 'border-ink bg-ink text-surface'
                  : 'border-line hover:border-line-2'
              }`}
            >
              <span className="text-[13.5px] font-semibold">{d.label}</span>
              <span className="text-[11.5px] opacity-75">{d.hint}</span>
            </button>
          ))}
        </div>
        {decision !== 'APPROVED' && noteCount > 0 && (
          <Alert tone="info">
            Your {noteCount} step {noteCount === 1 ? 'note' : 'notes'} from the preview will be
            attached.
          </Alert>
        )}
        <TextArea
          label={decision === 'APPROVED' ? 'Notes (optional)' : 'What needs to change?'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={2000}
        />
        {review.isError && <Alert tone="bad">{errorMessage(review.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => review.mutate()}
            loading={review.isPending}
            variant={decision === 'REJECTED' ? 'danger' : 'primary'}
            disabled={decision !== 'APPROVED' && !text.trim() && noteCount === 0}
          >
            {DECISIONS.find((d) => d.value === decision)?.label}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function PublishDialog({
  open,
  onClose,
  v,
  module,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  v: LessonVersionResponse;
  module: LessonModuleResponse;
  onDone: (v: LessonVersionResponse) => void;
}) {
  const [note, setNote] = useState(v.version.changeNote ?? '');
  const publish = useMutation({
    mutationFn: () =>
      api.post<LessonVersionResponse>(`/content/versions/${v.version.id}/publish`, {
        changeNote: note.trim(),
      }),
    onSuccess: (r) => {
      onClose();
      onDone(r);
    },
  });
  const live = module.versions.find((x) => x.id === module.publishedVersionId);
  return (
    <Dialog open={open} onClose={onClose} title="Publish to students">
      <div className="grid gap-4">
        <p className="text-sm text-ink-2">
          {live
            ? `v${v.version.versionNumber} replaces v${live.versionNumber} for every student right away. Their progress is kept; anyone who finished the lesson sees that it was updated.`
            : `v${v.version.versionNumber} becomes the lesson students open from their topic page.`}
        </p>
        <TextArea
          label="Change note"
          hint="Shown in the version history"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
        />
        {publish.isError && <Alert tone="bad">{errorMessage(publish.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => publish.mutate()}
            loading={publish.isPending}
            disabled={note.trim().length < 3}
          >
            Publish
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function Confirm({
  open,
  onClose,
  title,
  children,
  confirm,
  onConfirm,
  busy,
  danger,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  confirm: string;
  onConfirm: () => void;
  busy: boolean;
  danger?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="grid gap-4">
        <p className="text-sm text-ink-2">{children}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>
            {confirm}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function IssueList({ issues }: { issues: ContentIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <ul className="grid max-h-56 gap-1 overflow-auto rounded-xl border border-bad/30 bg-bad-bg p-3 text-[12.5px]">
      {issues.map((i) => (
        <li key={`${i.path}-${i.message}`} className="grid gap-0.5">
          <code className="font-mono text-[11.5px] font-semibold text-bad">{i.path}</code>
          <span className="text-ink">{i.message}</span>
        </li>
      ))}
    </ul>
  );
}

export { issuesOf };

/** After an AI rewrite: put the previous version of the step back in one click. */
function UndoRewrite({
  undo,
  v,
  onDone,
}: {
  undo: { versionId: string; previous: unknown; title: string };
  v: LessonVersionResponse;
  onDone: (v: LessonVersionResponse | null) => void;
}) {
  const key = (undo.previous as { key: string }).key;
  const restore = useMutation({
    mutationFn: () =>
      api.put<LessonVersionResponse>(`/content/versions/${v.version.id}/sections/${key}`, {
        editSeq: v.version.editSeq,
        section: undo.previous,
      }),
    onSuccess: (r) => onDone(r),
  });
  return (
    <Alert
      tone="ok"
      action={
        <span className="flex gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => restore.mutate()}
            loading={restore.isPending}
          >
            <Undo2 className="size-3.5" aria-hidden /> Undo
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDone(null)}>
            Keep it
          </Button>
        </span>
      }
    >
      AI rewrote "{undo.title}". Check it in Preview.
      {restore.isError && <span className="block text-bad">{errorMessage(restore.error)}</span>}
    </Alert>
  );
}
