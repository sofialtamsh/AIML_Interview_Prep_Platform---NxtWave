import {
  type AdminCatalogResponse,
  type AdminPracticeQuestionDto,
  type AdminPracticeResponse,
  type Difficulty,
  PRACTICE_LINK_HINT,
  type PracticeImportResponse,
  PracticeQuestionBody,
  PracticeQuestionFields,
  type TaxonomyResponse,
} from '@app/contracts';
import {
  Alert,
  Badge,
  type BadgeTone,
  Button,
  Card,
  Chip,
  cn,
  Dialog,
  EmptyState,
  errorMessage,
  fromApiError,
  SelectField,
  Spinner,
  TextArea,
  TextField,
  validate,
} from '@app/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ExternalLink, Pencil, Plus, Search, Star, Trash2, Upload } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { PageHeader, RoleChip, Table, Td, Th } from '../../components/table';
import { api, queryClient } from '../../lib/api';
import { curriculumKeys } from '../../lib/curriculum';

const KEY = ['admin', 'practice'] as const;
const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });

const DIFFICULTY: Record<Difficulty, { label: string; tone: BadgeTone }> = {
  EASY: { label: 'Easy', tone: 'ok' },
  MEDIUM: { label: 'Medium', tone: 'warn' },
  HARD: { label: 'Hard', tone: 'bad' },
  EXPERT: { label: 'Expert', tone: 'neutral' },
};
const DIFFICULTY_OPTIONS = (Object.keys(DIFFICULTY) as Difficulty[]).map((d) => ({
  value: d,
  label: DIFFICULTY[d].label,
}));

type Taxonomy = TaxonomyResponse['topics'];

/** Readable labels for a question's tags: the subtopics, and topics tagged on their own. */
function tagLabels(q: { topicIds: string[]; subtopicIds: string[] }, taxonomy: Taxonomy) {
  const labels: string[] = [];
  for (const t of taxonomy) {
    const subs = t.subtopics.filter((s) => q.subtopicIds.includes(s.id));
    for (const s of subs) labels.push(s.title);
    if (q.topicIds.includes(t.id) && subs.length === 0) labels.push(t.title);
  }
  return labels;
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

export function PracticePage() {
  const list = useQuery({
    queryKey: KEY,
    queryFn: () => api.get<AdminPracticeResponse>('/practice/'),
  });
  const catalog = useQuery({
    queryKey: ['admin', 'catalog'],
    queryFn: () => api.get<AdminCatalogResponse>('/catalog/'),
  });
  const taxonomyQuery = useQuery({
    queryKey: curriculumKeys.taxonomy,
    queryFn: () => api.get<TaxonomyResponse>('/curriculum/taxonomy'),
  });
  const taxonomy = useMemo(
    () =>
      [...(taxonomyQuery.data?.topics ?? [])]
        .filter((t) => t.status === 'ACTIVE')
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [taxonomyQuery.data],
  );
  const [editing, setEditing] = useState<AdminPracticeQuestionDto | 'new' | null>(null);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<'all' | 'published' | 'draft'>('all');

  const toggle = useMutation({
    mutationFn: (q: AdminPracticeQuestionDto) =>
      api.patch(`/practice/${q.id}`, { published: !q.published }),
    onSuccess: refresh,
  });
  const publishAll = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await api.patch(`/practice/${id}`, { published: true });
    },
    onSettled: refresh,
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/practice/${id}`),
    onSuccess: refresh,
  });

  const items = list.data?.items ?? [];
  const roles = catalog.data?.roles ?? [];
  const roleById = new Map(roles.map((r) => [r.id, r]));
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!category || i.category === category) &&
        (status === 'all' || (status === 'published') === i.published) &&
        (!q ||
          `${i.title} ${i.skill ?? ''} ${i.solveUrl} ${tagLabels(i, taxonomy).join(' ')}`
            .toLowerCase()
            .includes(q)),
    );
  }, [items, search, category, status, taxonomy]);
  const drafts = items.filter((i) => !i.published);
  const opens = items.reduce((a, i) => a + i.opens.total, 0);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 animate-rise">
      <PageHeader
        eyebrow="Content"
        title="Practice questions"
        sub="Questions students solve on the NxtWave learning portal. Published questions appear in each student's Practice tab, for their role, and Solve opens the link in a new tab."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setImporting(true)}>
              <Upload className="size-4" aria-hidden /> Import from sheet
            </Button>
            <Button onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden /> Add question
            </Button>
          </div>
        }
      />

      {list.isPending && <Spinner />}
      {list.isError && <Alert tone="bad">{errorMessage(list.error)}</Alert>}

      {list.data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Kpi label="Questions" value={items.length} />
            <Kpi label="Published" value={items.length - drafts.length} />
            <Kpi label="Solve clicks" value={opens} />
          </div>

          <Card>
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
              <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-[10px] border border-line-2 px-3">
                <Search className="size-4 text-muted" aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title, skill or link"
                  aria-label="Search questions"
                  className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
                />
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Category"
                className="rounded-[10px] border border-line-2 bg-surface px-3 py-2 text-sm"
              >
                <option value="">All categories</option>
                {list.data.categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                aria-label="Status"
                className="rounded-[10px] border border-line-2 bg-surface px-3 py-2 text-sm"
              >
                <option value="all">Any status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              {drafts.length > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={publishAll.isPending}
                  onClick={() =>
                    window.confirm(`Publish all ${drafts.length} drafts to students?`) &&
                    publishAll.mutate(drafts.map((d) => d.id))
                  }
                >
                  Publish all drafts ({drafts.length})
                </Button>
              )}
            </div>
            {items.length === 0 ? (
              <EmptyState title="No practice questions yet">
                Add questions one by one, or paste rows from the content sheet with "Import from
                sheet". Each question needs a link to the learning portal.
              </EmptyState>
            ) : shown.length === 0 ? (
              <EmptyState title="Nothing matches these filters" />
            ) : (
              <Table minWidth={900}>
                <thead>
                  <tr>
                    <Th>Question</Th>
                    <Th>Category</Th>
                    <Th>Difficulty</Th>
                    <Th>Topics</Th>
                    <Th>Roles</Th>
                    <Th>Opened by</Th>
                    <Th>Rating</Th>
                    <Th>Status</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((q) => (
                    <tr key={q.id}>
                      <Td className="max-w-[360px]">
                        <b className="block">{q.title}</b>
                        <a
                          href={q.solveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[12px] text-brand hover:underline"
                        >
                          {hostOf(q.solveUrl)} <ExternalLink className="size-3" aria-hidden />
                        </a>
                        {q.skill && <span className="ml-2 text-[12px] text-muted">{q.skill}</span>}
                      </Td>
                      <Td className="text-ink-2">{q.category}</Td>
                      <Td>
                        <Badge tone={DIFFICULTY[q.difficulty].tone}>
                          {DIFFICULTY[q.difficulty].label}
                        </Badge>
                      </Td>
                      <Td className="max-w-[220px]">
                        {tagLabels(q, taxonomy).length === 0 ? (
                          <span className="text-[12.5px] text-muted">Not tagged</span>
                        ) : (
                          <span className="flex flex-wrap gap-1">
                            {tagLabels(q, taxonomy).map((l) => (
                              <span
                                key={l}
                                className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11.5px] text-ink-2"
                              >
                                {l}
                              </span>
                            ))}
                          </span>
                        )}
                      </Td>
                      <Td>
                        {q.roleIds.length === 0 ? (
                          <span className="text-[12.5px] text-muted">All roles</span>
                        ) : (
                          <span className="flex gap-1">
                            {q.roleIds.map((id) => {
                              const r = roleById.get(id);
                              return r ? (
                                <span key={id} title={r.title}>
                                  <RoleChip code={r.shortCode} color={r.colorKey} />
                                </span>
                              ) : null;
                            })}
                          </span>
                        )}
                      </Td>
                      <Td className="font-mono text-[13px]">
                        {q.opens.students}
                        <span className="text-muted"> · {q.opens.total} clicks</span>
                      </Td>
                      <Td className="font-mono text-[13px] whitespace-nowrap">
                        {q.rating.count === 0 ? (
                          <span className="text-muted">–</span>
                        ) : (
                          <>
                            <Star className="mr-1 inline size-3.5 text-warn" aria-hidden />
                            {q.rating.average}
                            <span className="text-muted"> · {q.rating.count}</span>
                          </>
                        )}
                      </Td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => toggle.mutate(q)}
                          disabled={toggle.isPending}
                          title={q.published ? 'Unpublish' : 'Publish'}
                        >
                          <Badge tone={q.published ? 'live' : 'planned'} dot>
                            {q.published ? 'Published' : 'Draft'}
                          </Badge>
                        </button>
                      </Td>
                      <Td className="text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Edit ${q.title}`}
                          onClick={() => setEditing(q)}
                        >
                          <Pencil className="size-3.5" aria-hidden />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Delete ${q.title}`}
                          onClick={() =>
                            window.confirm(
                              `Delete "${q.title}"? Students stop seeing it. Unpublish instead to keep it for later.`,
                            ) && del.mutate(q.id)
                          }
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </>
      )}

      {editing && (
        <QuestionDialog
          question={editing === 'new' ? null : editing}
          categories={list.data?.categories ?? []}
          roles={roles}
          taxonomy={taxonomy}
          nextSort={(items.reduce((m, i) => Math.max(m, i.sortOrder), 0) || 0) + 10}
          onClose={() => setEditing(null)}
        />
      )}
      {importing && (
        <ImportDialog roles={roles} taxonomy={taxonomy} onClose={() => setImporting(false)} />
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-1.5 font-display text-[26px] font-bold tabular-nums">
        {value.toLocaleString('en-IN')}
      </div>
    </Card>
  );
}

type RoleOption = AdminCatalogResponse['roles'][number];

function RolePicker({
  roles,
  value,
  onChange,
}: {
  roles: RoleOption[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-[13px] font-semibold">Roles</span>
      <div className="flex flex-wrap gap-2">
        <Chip selected={value.length === 0} onClick={() => onChange([])}>
          All roles
        </Chip>
        {roles.map((r) => {
          const on = value.includes(r.id);
          return (
            <Chip
              key={r.id}
              selected={on}
              onClick={() => onChange(on ? value.filter((v) => v !== r.id) : [...value, r.id])}
            >
              {r.title}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}

/** Interview topics and subtopics a question practises: it is listed on those topic pages. */
function TagPicker({
  taxonomy,
  topicIds,
  subtopicIds,
  onChange,
}: {
  taxonomy: Taxonomy;
  topicIds: string[];
  subtopicIds: string[];
  onChange: (next: { topicIds: string[]; subtopicIds: string[] }) => void;
}) {
  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  const count = topicIds.length + subtopicIds.length;
  return (
    <div className="grid gap-1.5">
      <span className="text-[13px] font-semibold">
        Topics and subtopics{' '}
        <span className="font-normal text-muted">
          · {count === 0 ? 'none yet: it only shows in the Practice tab' : `${count} selected`}
        </span>
      </span>
      <div className="grid max-h-60 gap-2.5 overflow-y-auto rounded-xl border border-line p-3">
        {taxonomy.map((t) => (
          <div key={t.id} className="grid gap-1.5">
            <Chip
              selected={topicIds.includes(t.id)}
              onClick={() => onChange({ topicIds: toggle(topicIds, t.id), subtopicIds })}
              className="justify-self-start font-semibold"
            >
              {t.title}
            </Chip>
            {t.subtopics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-4">
                {t.subtopics
                  .filter((s) => s.status === 'ACTIVE')
                  .map((s) => (
                    <Chip
                      key={s.id}
                      selected={subtopicIds.includes(s.id)}
                      onClick={() => onChange({ topicIds, subtopicIds: toggle(subtopicIds, s.id) })}
                      className="px-2.5 py-1 text-[12px]"
                    >
                      {s.title}
                    </Chip>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <span className="text-[12px] text-muted">
        Tag the subtopic when the question practises one; tag the topic for broader questions.
      </span>
    </div>
  );
}

function QuestionDialog({
  question,
  categories,
  roles,
  taxonomy,
  nextSort,
  onClose,
}: {
  question: AdminPracticeQuestionDto | null;
  categories: string[];
  roles: RoleOption[];
  taxonomy: Taxonomy;
  nextSort: number;
  onClose: () => void;
}) {
  const live = roles.filter((r) => r.availability === 'LIVE').map((r) => r.id);
  const [roleIds, setRoleIds] = useState<string[]>(question?.roleIds ?? live);
  const [tags, setTags] = useState({
    topicIds: question?.topicIds ?? [],
    subtopicIds: question?.subtopicIds ?? [],
  });
  const [published, setPublished] = useState(question?.published ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: (body: unknown) =>
      question ? api.patch(`/practice/${question.id}`, body) : api.post('/practice/', body),
    onSuccess: () => {
      void refresh();
      onClose();
    },
    onError: (err) => setErrors(fromApiError(err).fields),
  });

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (k: string) => String(f.get(k) ?? '').trim();
    const minutes = text('estimatedMinutes');
    const result = validate(PracticeQuestionBody, {
      title: text('title'),
      category: text('category'),
      skill: text('skill') || null,
      description: text('description') || null,
      difficulty: text('difficulty'),
      solveUrl: text('solveUrl'),
      estimatedMinutes: minutes ? Number(minutes) : null,
      askedAt: text('askedAt')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean),
      ...tags,
      roleIds,
      published,
      sortOrder: Number(text('sortOrder') || nextSort),
    });
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    save.mutate(result.data);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={question ? 'Edit practice question' : 'Add practice question'}
      wide
    >
      <form noValidate onSubmit={submit} className="grid gap-4">
        <TextField
          name="title"
          label="Question name"
          defaultValue={question?.title}
          placeholder="Implement linear regression with gradient descent"
          error={errors.title}
          autoFocus
        />
        <TextField
          name="solveUrl"
          type="url"
          label="Link on the learning portal"
          defaultValue={question?.solveUrl}
          placeholder="https://learning.ccbp.in/course?c_id=…&t_id=…&s_id=…"
          error={errors.solveUrl}
          hint={PRACTICE_LINK_HINT}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="category"
            label="Category"
            list="practice-categories"
            defaultValue={question?.category}
            placeholder="Machine Learning"
            error={errors.category}
          />
          <datalist id="practice-categories">
            {[
              ...new Set([
                ...categories,
                'Python',
                'DSA',
                'Machine Learning',
                'Deep Learning',
                'NLP',
                'Computer Vision',
                'GenAI',
              ]),
            ].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <TextField
            name="skill"
            label="Skill (optional)"
            defaultValue={question?.skill ?? ''}
            placeholder="Linear regression"
            error={errors.skill}
          />
        </div>
        <TextArea
          name="description"
          label="Description (optional)"
          rows={2}
          maxLength={300}
          defaultValue={question?.description ?? ''}
          placeholder="Fit a line to the data with gradient descent, then report RMSE."
          error={errors.description}
        />
        <TextField
          name="askedAt"
          label="Asked at (optional)"
          defaultValue={question?.askedAt.join(', ') ?? ''}
          placeholder="Company names, separated by commas"
          error={errors.askedAt}
        />
        <TagPicker
          taxonomy={taxonomy}
          topicIds={tags.topicIds}
          subtopicIds={tags.subtopicIds}
          onChange={setTags}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            name="difficulty"
            label="Difficulty"
            options={DIFFICULTY_OPTIONS}
            defaultValue={question?.difficulty ?? 'MEDIUM'}
            error={errors.difficulty}
          />
          <TextField
            name="estimatedMinutes"
            type="number"
            label="Minutes (optional)"
            min={5}
            max={240}
            defaultValue={question?.estimatedMinutes ?? ''}
            error={errors.estimatedMinutes}
          />
          <TextField
            name="sortOrder"
            type="number"
            label="Order"
            min={0}
            defaultValue={question?.sortOrder ?? nextSort}
            error={errors.sortOrder}
            hint="Lower comes first"
          />
        </div>
        <RolePicker roles={roles} value={roleIds} onChange={setRoleIds} />
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="size-4 accent-[var(--brand)]"
          />
          Published: students see it in their Practice tab
        </label>
        {save.isError && Object.keys(errors).length === 0 && (
          <Alert tone="bad">{errorMessage(save.error)}</Alert>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {question ? 'Save changes' : 'Add question'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ───────────── Import ─────────────

/** Without a header row, columns are read in this order. */
const COLUMNS = [
  'title',
  'category',
  'skill',
  'difficulty',
  'solveUrl',
  'estimatedMinutes',
  'topic',
  'subtopic',
  'description',
  'askedAt',
] as const;
type Column = (typeof COLUMNS)[number];
const ALIASES: Record<Column, string[]> = {
  title: ['title', 'question', 'question name', 'name'],
  category: ['category', 'course', 'group'],
  skill: ['skill', 'concept'],
  difficulty: ['difficulty', 'level'],
  solveUrl: ['link', 'url', 'solve link', 'solve url', 'portal link', 'question link'],
  estimatedMinutes: ['minutes', 'mins', 'time', 'duration'],
  topic: ['topic', 'topics', 'interview topic'],
  subtopic: ['subtopic', 'subtopics', 'sub topic', 'sub-topic'],
  description: ['description', 'details', 'summary'],
  askedAt: ['asked at', 'companies', 'company'],
};
const splitList = (cell: string) =>
  cell
    .split(/[;|,]/)
    .map((x) => x.trim())
    .filter(Boolean);
const norm = (s: string) => s.trim().toLowerCase();
const LEVEL: Record<string, Difficulty> = {
  easy: 'EASY',
  medium: 'MEDIUM',
  med: 'MEDIUM',
  hard: 'HARD',
  expert: 'EXPERT',
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      out.push(cell.trim());
      cell = '';
    } else cell += ch;
  }
  out.push(cell.trim());
  return out;
}

export interface ParsedRow {
  line: number;
  title: string;
  ok: boolean;
  data?: PracticeQuestionFields;
  error?: string;
}

/**
 * Rows copied from Google Sheets (tab-separated) or a CSV, with or without a header row. Topic and
 * subtopic cells name taxonomy entries by title or slug (several separated by ";", "|" or ",").
 */
export function parseRows(text: string, taxonomy: Taxonomy = []): ParsedRow[] {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => l.trim());
  if (lines.length === 0) return [];
  const tsv = lines.some((l) => l.includes('\t'));
  const table = lines.map((l) => (tsv ? l.split('\t').map((c) => c.trim()) : splitCsvLine(l)));
  const head = (table[0] ?? []).map((c) => c.toLowerCase());
  const isHeader =
    head.some((c) => ALIASES.title.includes(c)) && head.some((c) => ALIASES.solveUrl.includes(c));
  const index = Object.fromEntries(
    COLUMNS.map((col, i) => [col, isHeader ? head.findIndex((c) => ALIASES[col].includes(c)) : i]),
  ) as Record<Column, number>;

  return table.slice(isHeader ? 1 : 0).map((cells, i) => {
    const get = (col: Column) => (index[col] >= 0 ? (cells[index[col]] ?? '').trim() : '');
    const title = get('title');
    const level = LEVEL[get('difficulty').toLowerCase()];
    const minutes = get('estimatedMinutes').replace(/[^0-9]/g, '');
    const line = i + 1 + (isHeader ? 1 : 0);
    if (!level) {
      return { line, title, ok: false, error: 'Difficulty must be Easy, Medium, Hard or Expert' };
    }
    const topicIds: string[] = [];
    for (const name of splitList(get('topic'))) {
      const t = taxonomy.find((x) => norm(x.title) === norm(name) || x.slug === norm(name));
      if (!t) return { line, title, ok: false, error: `Unknown topic: ${name}` };
      topicIds.push(t.id);
    }
    const subtopicIds: string[] = [];
    for (const name of splitList(get('subtopic'))) {
      const sub = taxonomy
        .flatMap((t) => t.subtopics)
        .find((x) => norm(x.title) === norm(name) || x.slug === norm(name));
      if (!sub) return { line, title, ok: false, error: `Unknown subtopic: ${name}` };
      subtopicIds.push(sub.id);
    }
    const r = PracticeQuestionFields.safeParse({
      title,
      category: get('category'),
      skill: get('skill') || null,
      description: get('description') || null,
      difficulty: level,
      solveUrl: get('solveUrl'),
      estimatedMinutes: minutes ? Number(minutes) : null,
      askedAt: splitList(get('askedAt')),
      topicIds,
      subtopicIds,
    });
    return r.success
      ? { line, title, ok: true, data: r.data }
      : { line, title, ok: false, error: r.error.issues[0]?.message ?? 'Invalid row' };
  });
}

function ImportDialog({
  roles,
  taxonomy,
  onClose,
}: {
  roles: RoleOption[];
  taxonomy: Taxonomy;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [roleIds, setRoleIds] = useState<string[]>(
    roles.filter((r) => r.availability === 'LIVE').map((r) => r.id),
  );
  const [publish, setPublish] = useState(false);
  const [result, setResult] = useState<PracticeImportResponse | null>(null);
  const rows = useMemo(() => parseRows(text, taxonomy), [text, taxonomy]);
  const valid = rows.filter((r) => r.ok && r.data);
  const run = useMutation({
    mutationFn: () =>
      api.post<PracticeImportResponse>('/practice/import', {
        rows: valid.map((r) => r.data),
        roleIds,
        published: publish,
      }),
    onSuccess: (r) => {
      setResult(r);
      void refresh();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Import practice questions" wide>
      {result ? (
        <div className="grid gap-4">
          <Alert tone="ok">
            Imported {result.created} question{result.created === 1 ? '' : 's'}
            {publish ? ' and published them' : ' as drafts'}.
            {result.skipped.length > 0 && ` Skipped ${result.skipped.length}.`}
          </Alert>
          {result.skipped.length > 0 && (
            <ul className="grid gap-1 text-[13px] text-ink-2">
              {result.skipped.map((s) => (
                <li key={`${s.row}-${s.title}`}>
                  Row {s.row}: {s.title} · <span className="text-muted">{s.reason}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <TextArea
            label="Paste rows from the content sheet"
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              'title\tcategory\tskill\tdifficulty\tlink\tminutes\nImplement linear regression\tMachine Learning\tRegression\tMedium\thttps://learning.ccbp.in/course?c_id=…&s_id=…\t20'
            }
            hint="Copy the cells straight from Google Sheets (or paste CSV). Columns: title, category, skill, difficulty, link, minutes, topic, subtopic, description, asked at. Only title, category, difficulty and link are required; topics and subtopics are matched by name (separate several with ';'). A header row is detected automatically."
          />
          {rows.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-xl border border-line">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-surface-2">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-mono text-[11px] text-muted">Row</th>
                    <th className="px-3 py-2 font-mono text-[11px] text-muted">Question</th>
                    <th className="px-3 py-2 font-mono text-[11px] text-muted">Check</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.line} className="border-t border-line">
                      <td className="px-3 py-1.5 font-mono text-muted">{r.line}</td>
                      <td className="px-3 py-1.5">
                        {r.title || <span className="text-muted">(no title)</span>}
                        {r.data && (
                          <span className="ml-2 text-muted">
                            {r.data.category} · {DIFFICULTY[r.data.difficulty].label} ·{' '}
                            {hostOf(r.data.solveUrl)}
                            {r.data.topicIds.length + r.data.subtopicIds.length > 0 &&
                              ` · ${tagLabels(r.data, taxonomy).join(', ')}`}
                          </span>
                        )}
                      </td>
                      <td className={cn('px-3 py-1.5', r.ok ? 'text-ok' : 'text-bad')}>
                        {r.ok ? '✓ Ready' : r.error}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <RolePicker roles={roles} value={roleIds} onChange={setRoleIds} />
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={publish}
              onChange={(e) => setPublish(e.target.checked)}
              className="size-4 accent-[var(--brand)]"
            />
            Publish right away (otherwise they arrive as drafts to check first)
          </label>
          {rows.length > valid.length && (
            <Alert tone="warn">
              {rows.length - valid.length} row{rows.length - valid.length === 1 ? ' has' : 's have'}{' '}
              problems and will be skipped. Fix them in the sheet and paste them again.
            </Alert>
          )}
          {run.isError && <Alert tone="bad">{errorMessage(run.error)}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={valid.length === 0}
              loading={run.isPending}
              onClick={() => run.mutate()}
            >
              Import {valid.length} question{valid.length === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
