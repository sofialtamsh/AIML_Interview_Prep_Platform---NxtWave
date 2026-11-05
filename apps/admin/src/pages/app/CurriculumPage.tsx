import {
  type AdminCatalogResponse,
  type CurriculaIndex,
  type CurriculumDto,
  type CurriculumOverview,
  type PublishResponse,
  SaveDraftBody,
  type TaxonomyResponse,
} from '@app/contracts';
import {
  Alert,
  Badge,
  Button,
  Card,
  cn,
  Dialog,
  errorMessage,
  Spinner,
  TextArea,
  TextField,
  validate,
} from '@app/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronDown, Send, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { lines, PageHeader, RoleChip, Tabs, timeAgo } from '../../components/table';
import { api, queryClient } from '../../lib/api';
import { curriculumKeys } from '../../lib/curriculum';
import { TaxonomyTab } from './TaxonomyTab';

const TABS = [
  { id: 'curricula', label: 'Role curricula' },
  { id: 'taxonomy', label: 'Topics & subtopics' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function CurriculumPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'curricula') as TabId;
  const catalog = useQuery({
    queryKey: ['admin', 'catalog'],
    queryFn: () => api.get<AdminCatalogResponse>('/catalog/'),
  });
  const taxonomy = useQuery({
    queryKey: curriculumKeys.taxonomy,
    queryFn: () => api.get<TaxonomyResponse>('/curriculum/taxonomy'),
  });

  return (
    <div className="grid gap-5 animate-rise">
      <PageHeader
        eyebrow="Content"
        title="Curriculum"
        sub="What each role needs at each package, and how deep. Students only see a change after you publish, and then they choose whether to take it."
      />
      <Tabs tabs={TABS} value={tab} onChange={(id) => setParams({ tab: id })} />
      {(catalog.isPending || taxonomy.isPending) && <Spinner />}
      {(catalog.isError || taxonomy.isError) && (
        <Alert tone="bad">{errorMessage(catalog.error ?? taxonomy.error)}</Alert>
      )}
      {catalog.data && taxonomy.data && (
        <>
          {tab === 'curricula' && <CurriculaTab catalog={catalog.data} taxonomy={taxonomy.data} />}
          {tab === 'taxonomy' && <TaxonomyTab catalog={catalog.data} taxonomy={taxonomy.data} />}
        </>
      )}
    </div>
  );
}

// ───────────────────────────── Role × package matrix ─────────────────────────────

function CurriculaTab({
  catalog,
  taxonomy,
}: {
  catalog: AdminCatalogResponse;
  taxonomy: TaxonomyResponse;
}) {
  const index = useQuery({
    queryKey: curriculumKeys.index,
    queryFn: () => api.get<CurriculaIndex>('/curriculum/curricula'),
  });
  const [picked, setPicked] = useState<{ roleId: string; bracketId: string } | null>(null);
  const firstPublished = index.data?.targets.find((t) => t.publishedVersion !== null);
  const sel = picked ?? firstPublished ?? null;

  if (index.isPending) return <Spinner />;
  if (index.isError) return <Alert tone="bad">{errorMessage(index.error)}</Alert>;
  const cell = (roleId: string, bracketId: string) =>
    index.data.targets.find((t) => t.roleId === roleId && t.bracketId === bracketId);

  return (
    <div className="grid gap-5">
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr>
              <th className="border-b border-line px-4 py-3 text-left font-mono text-[11px] font-semibold tracking-wider text-muted uppercase">
                Role
              </th>
              {catalog.brackets.map((b) => (
                <th
                  key={b.id}
                  className="border-b border-line px-3 py-3 text-left font-mono text-[11px] font-semibold tracking-wider text-muted uppercase"
                >
                  {b.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catalog.roles.map((r) => (
              <tr key={r.id}>
                <td className="border-b border-line px-4 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <RoleChip code={r.shortCode} color={r.colorKey} />
                    <b className="whitespace-nowrap">{r.title}</b>
                  </span>
                </td>
                {catalog.brackets.map((b) => {
                  const c = cell(r.id, b.id);
                  const selected = sel?.roleId === r.id && sel?.bracketId === b.id;
                  return (
                    <td key={b.id} className="border-b border-line px-2 py-2">
                      <button
                        type="button"
                        onClick={() => setPicked({ roleId: r.id, bracketId: b.id })}
                        aria-pressed={selected}
                        className={cn(
                          'grid w-full gap-0.5 rounded-lg border px-3 py-2 text-left transition',
                          selected
                            ? 'border-brand bg-brand-soft'
                            : 'border-line hover:border-line-2 hover:bg-surface-2',
                        )}
                      >
                        {c?.publishedVersion ? (
                          <>
                            <span className="flex items-center gap-1.5 font-semibold">
                              v{c.publishedVersion}
                              <span className="font-normal text-muted">· {c.itemCount} items</span>
                            </span>
                            <span className="flex items-center gap-1.5 text-[12px] text-muted">
                              {c.activeStudents} student{c.activeStudents === 1 ? '' : 's'}
                              {c.hasDraft && <Badge tone="warn">Draft</Badge>}
                            </span>
                          </>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                            {c?.hasDraft ? <Badge tone="warn">Draft</Badge> : 'Not set up'}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {sel && (
        <TargetEditor
          key={`${sel.roleId}:${sel.bracketId}`}
          roleId={sel.roleId}
          bracketId={sel.bracketId}
          catalog={catalog}
          taxonomy={taxonomy}
        />
      )}
    </div>
  );
}

// ───────────────────────────── Editor for one target ─────────────────────────────

interface Row {
  included: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  targetDepthRank: number;
  isOptional: boolean;
  objectives: string;
  implementationExpectation: string;
  rationale: string;
  estimate: string;
}

const emptyRow: Row = {
  included: false,
  priority: 'MEDIUM',
  targetDepthRank: 3,
  isOptional: false,
  objectives: '',
  implementationExpectation: '',
  rationale: '',
  estimate: '',
};

function rowsFrom(c: CurriculumDto | null): Record<string, Row> {
  const out: Record<string, Row> = {};
  for (const i of c?.items ?? []) {
    out[i.subtopicId] = {
      included: true,
      priority: i.priority,
      targetDepthRank: i.targetDepthRank,
      isOptional: i.isOptional,
      objectives: i.learningObjectives.join('\n'),
      implementationExpectation: i.implementationExpectation ?? '',
      rationale: i.rationale ?? '',
      estimate: i.estimateMinutesOverride ? String(i.estimateMinutesOverride) : '',
    };
  }
  return out;
}

function TargetEditor({
  roleId,
  bracketId,
  catalog,
  taxonomy,
}: {
  roleId: string;
  bracketId: string;
  catalog: AdminCatalogResponse;
  taxonomy: TaxonomyResponse;
}) {
  const key = curriculumKeys.target(roleId, bracketId);
  // Lives here so it survives the editor re-mounting after a save.
  const [notice, setNotice] = useState<string | null>(null);
  const overview = useQuery({
    queryKey: key,
    queryFn: () =>
      api.get<CurriculumOverview>(
        `/curriculum/curricula/target?roleId=${roleId}&bracketId=${bracketId}`,
      ),
  });
  if (overview.isPending) return <Spinner />;
  if (overview.isError) return <Alert tone="bad">{errorMessage(overview.error)}</Alert>;
  return (
    <EditorBody
      // Re-mount when the server copy changes so the working copy starts fresh.
      key={`${overview.data.draft?.updatedAt ?? ''}:${overview.data.published?.id ?? ''}`}
      overview={overview.data}
      catalog={catalog}
      taxonomy={taxonomy}
      notice={notice}
      setNotice={setNotice}
    />
  );
}

function EditorBody({
  overview,
  catalog,
  taxonomy,
  notice,
  setNotice,
}: {
  overview: CurriculumOverview;
  catalog: AdminCatalogResponse;
  taxonomy: TaxonomyResponse;
  notice: string | null;
  setNotice: (n: string | null) => void;
}) {
  const { roleId, bracketId, draft, published } = overview;
  const role = catalog.roles.find((r) => r.id === roleId);
  const bracket = catalog.brackets.find((b) => b.id === bracketId);
  const depthName = new Map(catalog.depthLevels.map((d) => [d.rank, d.name]));
  const base = useMemo(() => rowsFrom(draft ?? published), [draft, published]);
  const publishedRows = useMemo(() => rowsFrom(published), [published]);
  const [rows, setRows] = useState<Record<string, Row>>(base);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);

  const subtopics = taxonomy.topics.flatMap((t) =>
    t.subtopics
      .filter((s) => s.status === 'ACTIVE' || rows[s.id]?.included)
      .map((s) => ({ ...s, topic: t })),
  );
  const included = subtopics.filter((s) => rows[s.id]?.included);
  const dirty = JSON.stringify(normalise(rows)) !== JSON.stringify(normalise(base));
  const q = `roleId=${roleId}&bracketId=${bracketId}`;
  const targetKey = curriculumKeys.target(roleId, bracketId);

  const body = () => ({
    items: included.map((s) => {
      const r = rows[s.id] ?? emptyRow;
      return {
        subtopicId: s.id,
        priority: r.priority,
        targetDepthRank: r.targetDepthRank,
        isOptional: r.isOptional,
        learningObjectives: lines(r.objectives),
        implementationExpectation: r.implementationExpectation.trim() || null,
        rationale: r.rationale.trim() || null,
        estimateMinutesOverride: r.estimate.trim() ? Number(r.estimate) : null,
      };
    }),
  });

  /** Checks with the same contract as the server and opens the rows that need fixing. */
  function check() {
    const v = validate(SaveDraftBody, body());
    if (v.ok) {
      setErrors({});
      return v.data;
    }
    const byRow: Record<string, string> = {};
    for (const [path, msg] of Object.entries(v.errors)) {
      const m = path.match(/^items\.(\d+)\./);
      const s = m ? included[Number(m[1])] : undefined;
      if (s) byRow[s.id] ??= msg;
    }
    setErrors(byRow);
    setOpen(new Set([...open, ...Object.keys(byRow)]));
    return null;
  }

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: targetKey }),
      queryClient.invalidateQueries({ queryKey: curriculumKeys.index }),
    ]);

  const save = useMutation({
    mutationFn: (data: SaveDraftBody) =>
      api.put<CurriculumOverview>(`/curriculum/curricula/target/draft?${q}`, data),
    onSuccess: async (o) => {
      queryClient.setQueryData(targetKey, o);
      await queryClient.invalidateQueries({ queryKey: curriculumKeys.index });
      setNotice('Draft saved. Students still see the published version.');
    },
  });
  const discard = useMutation({
    mutationFn: () => api.delete<CurriculumOverview>(`/curriculum/curricula/target/draft?${q}`),
    onSuccess: async (o) => {
      queryClient.setQueryData(targetKey, o);
      await queryClient.invalidateQueries({ queryKey: curriculumKeys.index });
      setNotice('Draft discarded.');
    },
  });

  const set = (id: string, patch: Partial<Row>) =>
    setRows((prev) => ({ ...prev, [id]: { ...(prev[id] ?? emptyRow), ...patch } }));
  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            {role && <RoleChip code={role.shortCode} color={role.colorKey} />}
            <h2 className="text-lg">
              {role?.title} · {bracket?.label}
            </h2>
            {draft && <Badge tone="warn">Draft v{draft.version}</Badge>}
          </div>
          <p className="mt-1 text-[13px] text-muted">
            {published
              ? `Published v${published.version} ${timeAgo(published.publishedAt)}`
              : 'Not published yet'}{' '}
            · {overview.activeStudents} student{overview.activeStudents === 1 ? '' : 's'} on this
            target · {included.length} subtopics selected
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {draft && (
            <Button
              size="sm"
              variant="ghost"
              loading={discard.isPending}
              onClick={() => discard.mutate()}
            >
              <Trash2 className="size-3.5" aria-hidden /> Discard draft
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            disabled={!dirty}
            loading={save.isPending}
            onClick={() => {
              const data = check();
              if (data) save.mutate(data);
            }}
          >
            Save draft
          </Button>
          <Button
            size="sm"
            disabled={!draft && !dirty}
            onClick={() => {
              if (check()) setPublishing(true);
            }}
          >
            <Send className="size-3.5" aria-hidden /> Publish…
          </Button>
        </div>
      </div>

      {(notice || save.isError || discard.isError) && (
        <div className="border-b border-line px-5 py-3">
          {save.isError || discard.isError ? (
            <Alert tone="bad">{errorMessage(save.error ?? discard.error)}</Alert>
          ) : (
            <Alert tone="ok">{notice}</Alert>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="text-left font-mono text-[11px] tracking-wider text-muted uppercase">
              <th className="w-10 border-b border-line py-3 pl-5" aria-label="Included" />
              <th className="border-b border-line px-3 py-3 font-semibold">Subtopic</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Depth</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Priority</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Optional</th>
              <th className="border-b border-line px-3 py-3 font-semibold">Changes</th>
              <th className="w-10 border-b border-line pr-5" aria-label="Details" />
            </tr>
          </thead>
          {taxonomy.topics.map((t) => {
            const subs = subtopics.filter((s) => s.topic.id === t.id);
            if (subs.length === 0) return null;
            return (
              <tbody key={t.id}>
                <tr>
                  <td colSpan={7} className="bg-surface-2 px-5 py-2 font-semibold text-ink-2">
                    {t.title}
                  </td>
                </tr>
                {subs.map((s) => {
                  const r = rows[s.id] ?? emptyRow;
                  const was = publishedRows[s.id];
                  const change = !published
                    ? null
                    : r.included && !was
                      ? { tone: 'ok' as const, text: 'New' }
                      : !r.included && was
                        ? { tone: 'bad' as const, text: 'Removing' }
                        : r.included && was && was.targetDepthRank !== r.targetDepthRank
                          ? {
                              tone: 'next' as const,
                              text: `Was ${depthName.get(was.targetDepthRank)}`,
                            }
                          : null;
                  const isOpen = open.has(s.id);
                  return (
                    <SubtopicRows
                      key={s.id}
                      title={s.title}
                      slug={s.slug}
                      row={r}
                      change={change}
                      error={errors[s.id]}
                      open={isOpen}
                      depthLevels={catalog.depthLevels}
                      onToggleOpen={() => toggleOpen(s.id)}
                      onChange={(patch) => set(s.id, patch)}
                    />
                  );
                })}
              </tbody>
            );
          })}
        </table>
      </div>

      <History overview={overview} />

      {publishing && (
        <PublishDialog
          q={q}
          students={overview.activeStudents}
          pendingSave={dirty ? body() : null}
          onClose={() => setPublishing(false)}
          onDone={async (r) => {
            setPublishing(false);
            setNotice(
              `Published v${r.curriculum.version}. ${
                r.proposalsCreated === 0
                  ? 'No student plans needed a change.'
                  : `${r.proposalsCreated} student${r.proposalsCreated === 1 ? '' : 's'} got an update to accept or decline.`
              }`,
            );
            await refresh();
          }}
        />
      )}
    </Card>
  );
}

/** Compares working copies ignoring rows that are not included. */
function normalise(rows: Record<string, Row>) {
  return Object.entries(rows)
    .filter(([, r]) => r.included)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, r]) => [id, { ...r, objectives: lines(r.objectives).join('\n') }]);
}

const PRIORITIES = [
  { value: 'HIGH', label: 'Must-know' },
  { value: 'MEDIUM', label: 'Important' },
  { value: 'LOW', label: 'Nice to have' },
] as const;

function SubtopicRows({
  title,
  slug,
  row: r,
  change,
  error,
  open,
  depthLevels,
  onToggleOpen,
  onChange,
}: {
  title: string;
  slug: string;
  row: Row;
  change: { tone: 'ok' | 'bad' | 'next'; text: string } | null;
  error?: string;
  open: boolean;
  depthLevels: AdminCatalogResponse['depthLevels'];
  onToggleOpen: () => void;
  onChange: (patch: Partial<Row>) => void;
}) {
  const select =
    'rounded-lg border border-line-2 bg-surface px-2 py-1.5 text-[13px] disabled:opacity-40';
  return (
    <>
      <tr className={cn(!r.included && 'text-muted')}>
        <td className="border-b border-line py-2.5 pl-5">
          <input
            type="checkbox"
            checked={r.included}
            onChange={(e) => onChange({ included: e.target.checked })}
            className="size-4 accent-[var(--brand)]"
            aria-label={`Include ${title}`}
          />
        </td>
        <td className="border-b border-line px-3 py-2.5">
          <b className={cn('block font-semibold', r.included ? 'text-ink' : 'text-muted')}>
            {title}
          </b>
          <span className="font-mono text-[11.5px] text-muted">{slug}</span>
          {error && <span className="block text-[12.5px] font-medium text-bad">{error}</span>}
        </td>
        <td className="border-b border-line px-3 py-2.5">
          <select
            className={select}
            value={r.targetDepthRank}
            disabled={!r.included}
            onChange={(e) => onChange({ targetDepthRank: Number(e.target.value) })}
            aria-label={`Depth for ${title}`}
          >
            {depthLevels.map((d) => (
              <option key={d.rank} value={d.rank}>
                {d.rank} · {d.name}
              </option>
            ))}
          </select>
        </td>
        <td className="border-b border-line px-3 py-2.5">
          <select
            className={select}
            value={r.priority}
            disabled={!r.included}
            onChange={(e) => onChange({ priority: e.target.value as Row['priority'] })}
            aria-label={`Priority for ${title}`}
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </td>
        <td className="border-b border-line px-3 py-2.5">
          <input
            type="checkbox"
            checked={r.isOptional}
            disabled={!r.included}
            onChange={(e) => onChange({ isOptional: e.target.checked })}
            className="size-4 accent-[var(--brand)] disabled:opacity-40"
            aria-label={`${title} is optional`}
          />
        </td>
        <td className="border-b border-line px-3 py-2.5">
          {change && <Badge tone={change.tone}>{change.text}</Badge>}
        </td>
        <td className="border-b border-line pr-5 text-right">
          <button
            type="button"
            onClick={onToggleOpen}
            disabled={!r.included}
            aria-expanded={open}
            aria-label={`Details for ${title}`}
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 disabled:opacity-30"
          >
            <ChevronDown className={cn('size-4 transition', open && 'rotate-180')} />
          </button>
        </td>
      </tr>
      {open && r.included && (
        <tr>
          <td colSpan={7} className="border-b border-line bg-surface-2/50 px-5 py-4">
            <div className="grid gap-3 lg:grid-cols-2">
              <TextArea
                label="Learning objectives (one per line)"
                rows={4}
                value={r.objectives}
                error={error}
                onChange={(e) => onChange({ objectives: e.target.value })}
                hint="What the student can do at this depth. Shown on their roadmap."
              />
              <TextArea
                label="Why this depth for this package"
                rows={4}
                value={r.rationale}
                onChange={(e) => onChange({ rationale: e.target.value })}
                hint="For reviewers. Later checked by the Research Agent against interview evidence."
              />
              <TextField
                label="Hands-on expectation"
                value={r.implementationExpectation}
                onChange={(e) => onChange({ implementationExpectation: e.target.value })}
              />
              <TextField
                label="Time override (minutes)"
                inputMode="numeric"
                placeholder="Automatic from depth and complexity"
                value={r.estimate}
                onChange={(e) => onChange({ estimate: e.target.value.replace(/\D/g, '') })}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function PublishDialog({
  q,
  students,
  pendingSave,
  onClose,
  onDone,
}: {
  q: string;
  students: number;
  pendingSave: SaveDraftBody | null;
  onClose: () => void;
  onDone: (r: PublishResponse) => void;
}) {
  const [note, setNote] = useState('');
  const publish = useMutation({
    mutationFn: async () => {
      if (pendingSave) await api.put(`/curriculum/curricula/target/draft?${q}`, pendingSave);
      return api.post<PublishResponse>(`/curriculum/curricula/target/publish?${q}`, {
        changeNote: note,
      });
    },
    onSuccess: onDone,
  });
  return (
    <Dialog open onClose={onClose} title="Publish this curriculum">
      <div className="grid gap-4">
        <TextArea
          label="What changed and why"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Deeper RAG for 8–12 LPA after the October interview review"
          hint="Kept in the version history and the audit log."
        />
        <Alert tone="info">
          {students === 0
            ? 'No students are on this target yet. New students get this version straight away.'
            : `${students} student${students === 1 ? ' is' : 's are'} on this target. If their plan changes, they get an update they can accept or decline. Wording-only edits apply directly.`}
        </Alert>
        {publish.isError && <Alert tone="bad">{errorMessage(publish.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={note.trim().length < 3}
            loading={publish.isPending}
            onClick={() => publish.mutate()}
          >
            {pendingSave ? 'Save and publish' : 'Publish'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function History({ overview }: { overview: CurriculumOverview }) {
  if (overview.history.length === 0) return null;
  return (
    <div className="px-5 py-4">
      <h3 className="text-[14px]">Version history</h3>
      <ol className="mt-2 grid gap-2">
        {overview.history.map((h) => (
          <li key={h.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px]">
            <b className="font-mono">v{h.version}</b>
            <Badge
              tone={h.status === 'PUBLISHED' ? 'live' : h.status === 'DRAFT' ? 'warn' : 'neutral'}
            >
              {h.status === 'PUBLISHED' ? 'Live' : h.status === 'DRAFT' ? 'Draft' : 'Replaced'}
            </Badge>
            <span className="text-muted">
              {h.itemCount} items · {h.publishedAt ? timeAgo(h.publishedAt) : 'not published'}
            </span>
            {h.changeNote && <span className="text-ink-2">“{h.changeNote}”</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
