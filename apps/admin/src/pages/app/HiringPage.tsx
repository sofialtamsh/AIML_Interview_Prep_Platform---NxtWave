import type {
  HiringCtcBand,
  HiringFacetsResponse,
  HiringImportResponse,
  HiringOpeningsResponse,
  HiringOverviewResponse,
  HiringQuestionsResponse,
  HiringScope,
  HiringTopicCoverage,
} from '@app/contracts';
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
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, FileUp, Lock, Search } from 'lucide-react';
import { type ChangeEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { PageHeader, Table, Tabs, Td, Th } from '../../components/table';
import { api } from '../../lib/api';

const PAGE_SIZE = 25;

const SCOPES: Array<{ id: HiringScope; label: string }> = [
  { id: 'ML_FAMILY', label: 'ML Engineer family' },
  { id: 'ML_TITLE', label: 'ML, data-science and CV titles' },
  { id: 'AI_TITLE', label: 'AI-engineer titles' },
  { id: 'ALL', label: 'Every opening' },
];
const BANDS: Array<{ id: HiringCtcBand; label: string }> = [
  { id: 'UNDER_8_LPA', label: 'Under 8 LPA' },
  { id: 'FROM_8_LPA', label: '8 LPA and above' },
];
const DIFFICULTY_TONE: Record<string, BadgeTone> = { Easy: 'ok', Medium: 'warn', Hard: 'bad' };
const FAMILY_LABEL = { ML_TITLE: 'ML title', AI_TITLE: 'AI title' } as const;

const keys = {
  overview: ['hiring', 'overview'] as const,
  facets: (scope: HiringScope) => ['hiring', 'facets', scope] as const,
  questions: (qs: string) => ['hiring', 'questions', qs] as const,
  openings: (qs: string) => ['hiring', 'openings', qs] as const,
};

const pct = (n: number | null) => (n === null ? '–' : `${Math.round(n * 100)}%`);
const num = (n: number) => n.toLocaleString('en-IN');
const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const query = (params: Record<string, string | number | undefined>) =>
  new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)]),
  ).toString();

type Tab = 'evidence' | 'questions' | 'openings';

/** Super admins only: the Hiring Intelligence interview data behind the curriculum. */
export function HiringPage() {
  const [tab, setTab] = useState<Tab>('evidence');
  const [topicFilter, setTopicFilter] = useState('');
  const overview = useQuery({
    queryKey: keys.overview,
    queryFn: () => api.get<HiringOverviewResponse>('/hiring'),
  });
  const snap = overview.data?.snapshot;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 animate-rise">
      <PageHeader
        eyebrow="Super admin"
        title="Hiring intelligence"
        sub={
          snap
            ? `Interview questions from ${num(snap.companies)} companies in NxtWave placement drives, ${longDate(snap.dataFrom)} to ${longDate(snap.dataTo)}. This is the evidence behind the ML Engineer curriculum.`
            : 'Interview questions from NxtWave placement drives, imported from the Hiring Intelligence dashboard.'
        }
        action={<ImportButton current={snap?.questions ?? null} />}
      />
      <p className="flex items-center gap-2 text-[12.5px] text-muted">
        <Lock className="size-3.5" aria-hidden /> Only super admins can open this page. Students
        never see this data.
      </p>

      {overview.isPending && <Spinner />}
      {overview.isError && <Alert tone="bad">{errorMessage(overview.error)}</Alert>}
      {overview.data && !snap && (
        <Card>
          <EmptyState title="No interview data yet">
            Upload the JSON export from the Hiring Intelligence dashboard, or run{' '}
            <code>pnpm db:bootstrap</code> to load the copy kept in the repo.
          </EmptyState>
        </Card>
      )}
      {overview.data && snap && (
        <>
          <Tabs
            tabs={[
              { id: 'evidence', label: 'ML Engineer evidence' },
              { id: 'questions', label: 'Questions' },
              { id: 'openings', label: 'Openings' },
            ]}
            value={tab}
            onChange={setTab}
          />
          {tab === 'evidence' && (
            <Evidence
              data={overview.data}
              onTopic={(slug) => {
                setTopicFilter(slug);
                setTab('questions');
              }}
            />
          )}
          {tab === 'questions' && (
            <Questions topic={topicFilter} onTopic={setTopicFilter} total={snap.questions} />
          )}
          {tab === 'openings' && <Openings />}
          <p className="text-[12px] text-muted">
            Source: {snap.source} · imported {new Date(snap.importedAt).toLocaleString('en-IN')}
            {snap.importedBy ? ` by ${snap.importedBy}` : ' from the copy in the repo'} ·{' '}
            {num(snap.questions)} questions, {num(snap.opportunities)} job opportunities,{' '}
            {num(snap.openings)} openings.
          </p>
        </>
      )}
    </div>
  );
}

// ───────────── Evidence ─────────────

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Card className="p-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-1.5 font-display text-[26px] font-bold tabular-nums">{value}</div>
      <div className="text-[12.5px] text-muted">{note}</div>
    </Card>
  );
}

function Evidence({
  data,
  onTopic,
}: {
  data: HiringOverviewResponse;
  onTopic: (slug: string) => void;
}) {
  const f = data.family;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Companies"
          value={num(f.companies)}
          note={`${f.companiesUnder8} under 8 LPA · ${f.companiesFrom8} at 8 LPA+`}
        />
        <Kpi label="Job opportunities" value={num(f.opportunities)} note="ML Engineer family" />
        <Kpi
          label="Questions"
          value={num(f.questions)}
          note={`of ${num(data.snapshot?.questions ?? 0)} in all openings`}
        />
        <Kpi
          label="Title tiers"
          value={`${f.mlTitleCompanies} + ${f.aiTitleCompanies}`}
          note="companies with ML titles + AI titles"
        />
      </div>

      <Card>
        <div className="border-b border-line p-4 sm:px-5">
          <h2 className="text-base">How many ML/AI companies ask each topic</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Share of the {f.companies} companies that asked at least one question in the topic.
            Select a topic to read its questions.
          </p>
        </div>
        <Table minWidth={680}>
          <thead>
            <tr>
              <Th>Curriculum topic</Th>
              <Th className="w-[38%]">All companies</Th>
              <Th className="text-right">Under 8 LPA</Th>
              <Th className="text-right">8 LPA+</Th>
              <Th className="text-right">Questions</Th>
            </tr>
          </thead>
          <tbody>
            {data.topics.map((t) => (
              <CoverageRow key={t.slug} t={t} total={f.companies} onTopic={onTopic} />
            ))}
          </tbody>
        </Table>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <CountList
          title="Where the questions come up"
          rows={data.rounds.slice(0, 8)}
          total={f.questions}
        />
        <CountList title="Difficulty as reported" rows={data.difficulty} total={f.questions} />
      </div>
    </div>
  );
}

function CoverageRow({
  t,
  total,
  onTopic,
}: {
  t: HiringTopicCoverage;
  total: number;
  onTopic: (slug: string) => void;
}) {
  return (
    <tr className="hover:bg-surface-2">
      <Td>
        <button
          type="button"
          onClick={() => onTopic(t.slug)}
          className="inline-flex items-center gap-1.5 text-left font-semibold text-ink hover:text-brand-deep"
        >
          {t.title}
          <ArrowRight className="size-3.5 text-muted" aria-hidden />
        </button>
      </Td>
      <Td>
        <div
          className="flex items-center gap-3"
          title={`${t.companies} of ${total} companies (${pct(t.share)})`}
        >
          <span className="h-2 flex-1 rounded-full bg-surface-2">
            <span
              className="block h-2 rounded-r-[4px] bg-brand"
              style={{ width: `${Math.max(2, t.share * 100)}%` }}
            />
          </span>
          <span className="w-16 text-right font-mono text-[12.5px] tabular-nums text-ink">
            {pct(t.share)} <span className="text-muted">· {t.companies}</span>
          </span>
        </div>
      </Td>
      <Td className="text-right font-mono text-[12.5px] tabular-nums">{pct(t.shareUnder8)}</Td>
      <Td className="text-right font-mono text-[12.5px] tabular-nums">{pct(t.shareFrom8)}</Td>
      <Td className="text-right font-mono text-[12.5px] tabular-nums text-muted">
        {num(t.questions)}
      </Td>
    </tr>
  );
}

function CountList({
  title,
  rows,
  total,
}: {
  title: string;
  rows: Array<{ value: string; count: number }>;
  total: number;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <h3 className="font-sans text-[14px] font-semibold tracking-normal">{title}</h3>
      <ul className="mt-3 grid gap-2">
        {rows.map((r) => (
          <li
            key={r.value}
            className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-[13px]"
            title={`${num(r.count)} of ${num(total)} questions`}
          >
            <span className="truncate">{r.value}</span>
            <span className="font-mono text-[12px] tabular-nums text-muted">
              {num(r.count)} · {pct(total ? r.count / total : 0)}
            </span>
            <span className="col-span-2 h-1.5 rounded-full bg-surface-2">
              <span
                className="block h-1.5 rounded-r-[4px] bg-brand/70"
                style={{ width: `${Math.max(1, (100 * r.count) / Math.max(1, total))}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ───────────── Questions ─────────────

const selectCls = 'min-w-0 rounded-[10px] border border-line-2 bg-surface px-3 py-2 text-sm';

function Picker({
  label,
  value,
  onChange,
  options,
  all,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  all: string;
}) {
  return (
    <label className="grid gap-1 text-[12px] font-semibold text-muted">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const withCount = (rows: Array<{ value: string; count: number }>) =>
  rows.map((r) => ({ value: r.value, label: `${r.value} (${num(r.count)})` }));

function Questions({
  topic,
  onTopic,
  total,
}: {
  topic: string;
  onTopic: (slug: string) => void;
  total: number;
}) {
  const [scope, setScope] = useState<HiringScope>('ML_FAMILY');
  const [filters, setFilters] = useState({
    theme: '',
    round: '',
    company: '',
    domain: '',
    difficulty: '',
    band: '',
  });
  const [text, setText] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(text.trim());
  // Any change of filter starts again from page 1.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the filters are the trigger
  useEffect(() => setPage(1), [scope, topic, filters, q]);

  const facets = useQuery({
    queryKey: keys.facets(scope),
    queryFn: () => api.get<HiringFacetsResponse>(`/hiring/facets?scope=${scope}`),
    staleTime: 5 * 60_000,
  });
  const qs = query({ scope, prepTopic: topic, ...filters, q, page, pageSize: PAGE_SIZE });
  const list = useQuery({
    queryKey: keys.questions(qs),
    queryFn: () => api.get<HiringQuestionsResponse>(`/hiring/questions?${qs}`),
    placeholderData: keepPreviousData,
  });
  const set = (k: keyof typeof filters) => (v: string) => setFilters((f) => ({ ...f, [k]: v }));
  const fc = facets.data;
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;
  const anyFilter = topic || q || Object.values(filters).some(Boolean);

  return (
    <Card>
      <div className="grid gap-3 border-b border-line p-4 sm:px-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Picker
            label="Openings"
            value={scope}
            onChange={(v) => setScope((v || 'ML_FAMILY') as HiringScope)}
            options={SCOPES.slice(1).map((s) => ({ value: s.id, label: s.label }))}
            all={SCOPES[0]?.label ?? 'ML Engineer family'}
          />
          <Picker
            label="Curriculum topic"
            value={topic}
            onChange={onTopic}
            options={(fc?.prepTopics ?? []).map((t) => ({
              value: t.slug,
              label: `${t.title} (${num(t.count)})`,
            }))}
            all="Every topic"
          />
          <Picker
            label="Theme"
            value={filters.theme}
            onChange={set('theme')}
            options={withCount(fc?.themes ?? [])}
            all="Every theme"
          />
          <Picker
            label="Round"
            value={filters.round}
            onChange={set('round')}
            options={withCount(fc?.rounds ?? [])}
            all="Every round"
          />
          <Picker
            label="Company"
            value={filters.company}
            onChange={set('company')}
            options={withCount(fc?.companies ?? [])}
            all="Every company"
          />
          <Picker
            label="Domain"
            value={filters.domain}
            onChange={set('domain')}
            options={withCount(fc?.domains ?? [])}
            all="Every domain"
          />
          <Picker
            label="Difficulty"
            value={filters.difficulty}
            onChange={set('difficulty')}
            options={['Easy', 'Medium', 'Hard'].map((d) => ({ value: d, label: d }))}
            all="Any difficulty"
          />
          <Picker
            label="CTC"
            value={filters.band}
            onChange={set('band')}
            options={BANDS.map((b) => ({ value: b.id, label: b.label }))}
            all="Any CTC"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[16rem] flex-1">
            <span className="sr-only">Search the questions</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search questions, e.g. overfitting, tell me about yourself"
              className={cn(selectCls, 'w-full pl-9')}
            />
          </label>
          {anyFilter && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onTopic('');
                setText('');
                setFilters({
                  theme: '',
                  round: '',
                  company: '',
                  domain: '',
                  difficulty: '',
                  band: '',
                });
              }}
            >
              Clear filters
            </Button>
          )}
          <span className="ml-auto text-[12.5px] text-muted" aria-live="polite">
            {list.data ? `${num(list.data.total)} questions` : ''}
            {scope === 'ALL' ? ` of ${num(total)}` : ''}
          </span>
        </div>
      </div>

      {list.isError && (
        <div className="p-4">
          <Alert tone="bad">{errorMessage(list.error)}</Alert>
        </div>
      )}
      {list.isPending && (
        <div className="p-6">
          <Spinner />
        </div>
      )}
      {list.data && list.data.items.length === 0 && (
        <EmptyState title="No questions match">Try fewer filters or other words.</EmptyState>
      )}
      {list.data && list.data.items.length > 0 && (
        <ul className={cn('divide-y divide-line', list.isFetching && 'opacity-60')}>
          {list.data.items.map((item) => (
            <li key={item.id} className="grid gap-1.5 px-4 py-3.5 sm:px-5">
              <p className="text-[14.5px] font-medium text-ink">{item.text}</p>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-muted">
                {item.difficulty && (
                  <Badge tone={DIFFICULTY_TONE[item.difficulty] ?? 'neutral'}>
                    {item.difficulty}
                  </Badge>
                )}
                <b className="text-ink-2">{item.company}</b>
                <span>{item.role}</span>
                <Dot />
                <span>{item.round}</span>
                <Dot />
                <span>{longDate(item.askedOn)}</span>
                {item.theme && (
                  <>
                    <Dot />
                    <span className="text-brand-deep">{item.theme}</span>
                  </>
                )}
              </div>
              <div className="text-[12px] text-muted">
                {item.domain} › {item.topic}
                {item.subtopic ? ` › ${item.subtopic}` : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pager page={page} pages={pages} onPage={setPage} />
    </Card>
  );
}

const Dot = () => (
  <span aria-hidden className="text-line-2">
    ·
  </span>
);

function Pager({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (p: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 border-t border-line p-3">
      <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span className="text-[12.5px] text-muted">
        Page {page} of {num(pages)}
      </span>
      <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </div>
  );
}

// ───────────── Openings ─────────────

function Openings() {
  const [scope, setScope] = useState<HiringScope>('ML_FAMILY');
  const [band, setBand] = useState('');
  const [text, setText] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(text.trim());
  // biome-ignore lint/correctness/useExhaustiveDependencies: the filters are the trigger
  useEffect(() => setPage(1), [scope, band, q]);
  const qs = query({ scope, band, q, page, pageSize: PAGE_SIZE });
  const list = useQuery({
    queryKey: keys.openings(qs),
    queryFn: () => api.get<HiringOpeningsResponse>(`/hiring/openings?${qs}`),
    placeholderData: keepPreviousData,
  });
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1;
  const ctc = (min: number | null, max: number | null) =>
    min === null && max === null
      ? '–'
      : min !== null && max !== null && min !== max
        ? `${min}–${max}`
        : String(max ?? min);

  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3 border-b border-line p-4 sm:px-5">
        <Picker
          label="Openings"
          value={scope}
          onChange={(v) => setScope((v || 'ML_FAMILY') as HiringScope)}
          options={SCOPES.slice(1).map((s) => ({ value: s.id, label: s.label }))}
          all={SCOPES[0]?.label ?? 'ML Engineer family'}
        />
        <Picker
          label="CTC"
          value={band}
          onChange={setBand}
          options={BANDS.map((b) => ({ value: b.id, label: b.label }))}
          all="Any CTC"
        />
        <label className="relative min-w-[14rem] flex-1">
          <span className="sr-only">Search companies and job titles</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Company or job title"
            className={cn(selectCls, 'w-full pl-9')}
          />
        </label>
        <span className="ml-auto text-[12.5px] text-muted" aria-live="polite">
          {list.data ? `${num(list.data.total)} job opportunities` : ''}
        </span>
      </div>
      {list.isError && (
        <div className="p-4">
          <Alert tone="bad">{errorMessage(list.error)}</Alert>
        </div>
      )}
      {list.isPending && (
        <div className="p-6">
          <Spinner />
        </div>
      )}
      {list.data && list.data.items.length === 0 && (
        <EmptyState title="No openings match">Try other words or another CTC band.</EmptyState>
      )}
      {list.data && list.data.items.length > 0 && (
        <Table minWidth={860}>
          <thead>
            <tr>
              <Th>Company</Th>
              <Th>Job titles</Th>
              <Th className="text-right">CTC (LPA)</Th>
              <Th className="text-right">Seats</Th>
              <Th>Interviews</Th>
              <Th className="text-right">Questions</Th>
            </tr>
          </thead>
          <tbody className={cn(list.isFetching && 'opacity-60')}>
            {list.data.items.map((o) => (
              <tr key={o.id} className="align-top">
                <Td className="font-semibold text-ink">{o.company}</Td>
                <Td>
                  <div className="grid gap-1">
                    <span>{o.roles.join(' · ')}</span>
                    {o.family && (
                      <span>
                        <Badge tone={o.family === 'ML_TITLE' ? 'live' : 'next'}>
                          {FAMILY_LABEL[o.family]}
                        </Badge>
                      </span>
                    )}
                  </div>
                </Td>
                <Td className="text-right font-mono text-[12.5px] tabular-nums">
                  {ctc(o.ctcMinLpa, o.ctcMaxLpa)}
                </Td>
                <Td className="text-right font-mono text-[12.5px] tabular-nums">
                  {o.openings ?? '–'}
                </Td>
                <Td className="text-[12.5px] whitespace-nowrap">
                  {o.firstInterview === o.lastInterview
                    ? longDate(o.firstInterview)
                    : `${longDate(o.firstInterview)} – ${longDate(o.lastInterview)}`}
                </Td>
                <Td className="text-right font-mono text-[12.5px] tabular-nums">{o.questions}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pager page={page} pages={pages} onPage={setPage} />
    </Card>
  );
}

// ───────────── Import ─────────────

function ImportButton({ current }: { current: number | null }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<ReactNode>(null);
  const upload = useMutation({
    mutationFn: (data: unknown) => api.post<HiringImportResponse>('/hiring/import', data),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['hiring'] });
      setNote(
        <Alert tone="ok">
          {res.imported
            ? `Imported ${num(res.snapshot.questions)} questions (${longDate(res.snapshot.dataFrom)} to ${longDate(res.snapshot.dataTo)}).`
            : 'That file is already the current data. Nothing changed.'}
        </Alert>,
      );
    },
    onError: (err) => setNote(<Alert tone="bad">{errorMessage(err)}</Alert>),
  });

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setNote(null);
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      setNote(<Alert tone="bad">That file is not JSON. Upload the dashboard's export.</Alert>);
      return;
    }
    const replace =
      current === null ||
      window.confirm(
        `This replaces the current data (${num(current)} questions) with the file you picked. Continue?`,
      );
    if (replace) upload.mutate(data);
  }

  return (
    <div className="grid justify-items-end gap-2">
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        onChange={onFile}
        aria-label="Hiring Intelligence export (JSON)"
      />
      <Button variant="secondary" onClick={() => input.current?.click()} loading={upload.isPending}>
        <FileUp className="size-4" aria-hidden /> Upload new export
      </Button>
      {note && <div className="max-w-sm">{note}</div>}
    </div>
  );
}
