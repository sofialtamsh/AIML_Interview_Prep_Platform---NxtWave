import type {
  AdminBracketDto,
  AdminCatalogResponse,
  AdminRoleDto,
  Availability,
  DepthLevelDto,
  DifficultyPolicy,
  SkillAreaDto,
} from '@app/contracts';
import {
  Alert,
  AvailabilityBadge,
  Button,
  Card,
  Dialog,
  errorMessage,
  type FieldErrors,
  fromApiError,
  SelectField,
  Spinner,
  TextArea,
  TextField,
} from '@app/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { lines, PageHeader, RoleChip, Table, Tabs, Td, Th } from '../../components/table';
import { api, queryClient } from '../../lib/api';

const catalogKey = ['admin', 'catalog'] as const;
const refresh = () => queryClient.invalidateQueries({ queryKey: catalogKey });

const TABS = [
  { id: 'roles', label: 'Roles' },
  { id: 'packages', label: 'Packages' },
  { id: 'depth', label: 'Depth levels' },
  { id: 'skills', label: 'Skill areas' },
  { id: 'companies', label: 'Companies' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const AVAILABILITY: Array<{ value: Availability; label: string }> = [
  { value: 'LIVE', label: 'Live: students can pick it' },
  { value: 'NEXT_UP', label: 'Next up: visible, opening soon' },
  { value: 'PLANNED', label: 'Planned: visible, later' },
  { value: 'HIDDEN', label: 'Hidden: not shown to students' },
];

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'roles') as TabId;
  const catalog = useQuery({
    queryKey: catalogKey,
    queryFn: () => api.get<AdminCatalogResponse>('/catalog/'),
  });

  return (
    <div className="grid gap-5 animate-rise">
      <PageHeader
        eyebrow="Configuration"
        title="Catalog"
        sub="Roles, target packages and the depth scale that shape every student's plan. Changes apply instantly, no deploy needed."
      />
      <Tabs tabs={TABS} value={tab} onChange={(id) => setParams({ tab: id })} />
      {catalog.isPending && <Spinner />}
      {catalog.isError && <Alert tone="bad">{errorMessage(catalog.error)}</Alert>}
      {catalog.data && (
        <>
          {tab === 'roles' && <RolesTab data={catalog.data} />}
          {tab === 'packages' && <PackagesTab brackets={catalog.data.brackets} />}
          {tab === 'depth' && <DepthTab levels={catalog.data.depthLevels} />}
          {tab === 'skills' && <SkillsTab areas={catalog.data.skillAreas} />}
          {tab === 'companies' && <CompaniesTab companies={catalog.data.companies} />}
        </>
      )}
    </div>
  );
}

// ───────────────────────────── Roles ─────────────────────────────

function RolesTab({ data }: { data: AdminCatalogResponse }) {
  const [editing, setEditing] = useState<AdminRoleDto | 'new' | null>(null);
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-sm text-muted">
          Only LIVE roles can be chosen by students. Others show as coming soon with “Notify me”.
        </p>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus className="size-3.5" aria-hidden /> New role
        </Button>
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th>Students</Th>
            <Th>Want it</Th>
            <Th>Skill areas</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {data.roles.map((r) => (
            <tr key={r.id}>
              <Td>
                <span className="flex items-center gap-2.5">
                  <RoleChip code={r.shortCode} color={r.colorKey} />
                  <span>
                    <b className="block">{r.title}</b>
                    <span className="font-mono text-xs text-muted">{r.slug}</span>
                  </span>
                </span>
              </Td>
              <Td>
                <AvailabilityBadge value={r.availability} />
              </Td>
              <Td className="font-mono">{r.activeGoals}</Td>
              <Td className="font-mono">{r.interested > 0 ? `🔔 ${r.interested}` : '–'}</Td>
              <Td className="text-ink-2">{r.skillAreas.length}</Td>
              <Td className="text-right">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(r)}
                  aria-label={`Edit ${r.title}`}
                >
                  <Pencil className="size-3.5" aria-hidden /> Edit
                </Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {editing && (
        <RoleDialog
          role={editing === 'new' ? null : editing}
          areas={data.skillAreas}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}

function RoleDialog({
  role,
  areas,
  onClose,
}: {
  role: AdminRoleDto | null;
  areas: SkillAreaDto[];
  onClose: () => void;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [skills, setSkills] = useState<Record<string, number>>(
    Object.fromEntries(role?.skillAreas.map((s) => [s.skillAreaId, s.importance]) ?? []),
  );
  const save = useMutation({
    mutationFn: (body: unknown) =>
      role ? api.patch(`/catalog/roles/${role.id}`, body) : api.post('/catalog/roles', body),
    onSuccess: () => {
      void refresh();
      onClose();
    },
    onError: (err) => setErrors(fromApiError(err).fields),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? '');
    save.mutate({
      title: get('title'),
      slug: get('slug'),
      shortCode: get('shortCode'),
      colorKey: get('colorKey'),
      availability: get('availability'),
      sortOrder: Number(get('sortOrder') || 0),
      tagline: get('tagline'),
      description: get('description'),
      competencies: lines(get('competencies')),
      interviewFocus: lines(get('interviewFocus')),
      skillAreas: Object.entries(skills).map(([skillAreaId, importance]) => ({
        skillAreaId,
        importance,
      })),
    });
  }

  return (
    <Dialog open onClose={onClose} title={role ? `Edit ${role.title}` : 'New role'} wide>
      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        {save.isError && !Object.keys(errors).length && (
          <Alert tone="bad">{errorMessage(save.error)}</Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="title" label="Title" defaultValue={role?.title} error={errors.title} />
          <TextField
            name="slug"
            label="Slug (URL id)"
            defaultValue={role?.slug}
            error={errors.slug}
          />
          <TextField
            name="shortCode"
            label="Badge code"
            defaultValue={role?.shortCode}
            maxLength={4}
            error={errors.shortCode}
          />
          <SelectField
            name="colorKey"
            label="Badge colour"
            defaultValue={role?.colorKey ?? 'g0'}
            options={['g0', 'g1', 'g2', 'g3', 'g4'].map((c, i) => ({
              value: c,
              label: ['Blue', 'Orange', 'Teal', 'Violet', 'Pink'][i] ?? c,
            }))}
          />
          <SelectField
            name="availability"
            label="Status"
            defaultValue={role?.availability ?? 'PLANNED'}
            options={AVAILABILITY}
          />
          <TextField
            name="sortOrder"
            type="number"
            label="Order"
            defaultValue={String(role?.sortOrder ?? 0)}
            error={errors.sortOrder}
          />
        </div>
        <TextField
          name="tagline"
          label="Tagline"
          defaultValue={role?.tagline}
          error={errors.tagline}
        />
        <TextArea
          name="description"
          label="Description"
          rows={3}
          defaultValue={role?.description}
          error={errors.description}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextArea
            name="competencies"
            label="Competencies (one per line)"
            rows={6}
            defaultValue={role?.competencies.join('\n')}
          />
          <TextArea
            name="interviewFocus"
            label="Interview focus (one per line)"
            rows={6}
            defaultValue={role?.interviewFocus.join('\n')}
          />
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-[13px] font-semibold">
            Skill areas in the student self-check
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {areas.map((a) => {
              const on = a.id in skills;
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => {
                        const next = { ...skills };
                        if (e.target.checked) next[a.id] = 2;
                        else delete next[a.id];
                        setSkills(next);
                      }}
                    />
                    {a.name}
                  </label>
                  {on && (
                    <select
                      aria-label={`${a.name} importance`}
                      value={skills[a.id]}
                      onChange={(e) => setSkills({ ...skills, [a.id]: Number(e.target.value) })}
                      className="rounded-md border border-line-2 bg-surface px-1.5 py-0.5 text-xs"
                    >
                      <option value={3}>Core</option>
                      <option value={2}>Important</option>
                      <option value={1}>Useful</option>
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {role ? 'Save changes' : 'Create role'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ───────────────────────────── Packages ─────────────────────────────

const DIFFS = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'] as const;
const DIFF_COLOR: Record<(typeof DIFFS)[number], string> = {
  EASY: 'var(--ok)',
  MEDIUM: 'var(--warn)',
  HARD: 'var(--bad)',
  EXPERT: 'var(--g3)',
};

function MixBar({ policy }: { policy: DifficultyPolicy }) {
  const total = DIFFS.reduce((s, d) => s + policy[d], 0) || 1;
  return (
    <div className="grid gap-1">
      <div className="flex h-2 w-40 overflow-hidden rounded-full bg-surface-3">
        {DIFFS.map((d) => (
          <span
            key={d}
            style={{ width: `${(policy[d] / total) * 100}%`, background: DIFF_COLOR[d] }}
          />
        ))}
      </div>
      <span className="font-mono text-[11px] text-muted">
        {DIFFS.filter((d) => policy[d] > 0)
          .map((d) => `${d[0]}${Math.round((policy[d] / total) * 100)}`)
          .join(' · ')}
      </span>
    </div>
  );
}

function PackagesTab({ brackets }: { brackets: AdminBracketDto[] }) {
  const [editing, setEditing] = useState<AdminBracketDto | 'new' | null>(null);
  const [mixFor, setMixFor] = useState<AdminBracketDto | null>(null);
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-sm text-muted">
          Target annual compensation bands (not pricing). The difficulty mix steers practice
          questions.
        </p>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus className="size-3.5" aria-hidden /> New package
        </Button>
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Package</Th>
            <Th>Status</Th>
            <Th>Students</Th>
            <Th>Want it</Th>
            <Th>Question difficulty mix</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {brackets.map((b) => (
            <tr key={b.id}>
              <Td>
                <b className="font-display text-base">{b.label}</b>
                <span className="block text-xs text-muted">{b.headline}</span>
              </Td>
              <Td>
                <AvailabilityBadge value={b.availability} />
              </Td>
              <Td className="font-mono">{b.activeGoals}</Td>
              <Td className="font-mono">{b.interested > 0 ? `🔔 ${b.interested}` : '–'}</Td>
              <Td>
                <button
                  type="button"
                  onClick={() => setMixFor(b)}
                  className="text-left"
                  aria-label={`Edit difficulty mix for ${b.label}`}
                >
                  <MixBar policy={b.difficultyPolicy} />
                </button>
              </Td>
              <Td className="text-right">
                <Button size="sm" variant="ghost" onClick={() => setEditing(b)}>
                  <Pencil className="size-3.5" aria-hidden /> Edit
                </Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {editing && (
        <BracketDialog
          bracket={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {mixFor && <MixDialog bracket={mixFor} onClose={() => setMixFor(null)} />}
    </Card>
  );
}

function BracketDialog({
  bracket,
  onClose,
}: {
  bracket: AdminBracketDto | null;
  onClose: () => void;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const save = useMutation({
    mutationFn: (body: unknown) =>
      bracket
        ? api.patch(`/catalog/brackets/${bracket.id}`, body)
        : api.post('/catalog/brackets', body),
    onSuccess: () => {
      void refresh();
      onClose();
    },
    onError: (err) => setErrors(fromApiError(err).fields),
  });
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? '');
    save.mutate({
      code: get('code'),
      label: get('label'),
      minLpa: Number(get('minLpa')),
      maxLpa: get('maxLpa') ? Number(get('maxLpa')) : null,
      headline: get('headline'),
      expectations: get('expectations'),
      availability: get('availability'),
      sortOrder: Number(get('sortOrder') || 0),
    });
  }
  return (
    <Dialog open onClose={onClose} title={bracket ? `Edit ${bracket.label}` : 'New package'}>
      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        {save.isError && !Object.keys(errors).length && (
          <Alert tone="bad">{errorMessage(save.error)}</Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="label"
            label="Label"
            defaultValue={bracket?.label}
            placeholder="8–12 LPA"
            error={errors.label}
          />
          <TextField
            name="code"
            label="Code"
            defaultValue={bracket?.code}
            placeholder="LPA_8_12"
            error={errors.code}
          />
          <TextField
            name="minLpa"
            type="number"
            label="From (LPA)"
            defaultValue={String(bracket?.minLpa ?? '')}
            error={errors.minLpa}
          />
          <TextField
            name="maxLpa"
            type="number"
            label="Up to (LPA, empty = and above)"
            defaultValue={bracket?.maxLpa != null ? String(bracket.maxLpa) : ''}
            error={errors.maxLpa}
          />
          <SelectField
            name="availability"
            label="Status"
            defaultValue={bracket?.availability ?? 'PLANNED'}
            options={AVAILABILITY}
          />
          <TextField
            name="sortOrder"
            type="number"
            label="Order"
            defaultValue={String(bracket?.sortOrder ?? 0)}
          />
        </div>
        <TextField
          name="headline"
          label="Headline"
          defaultValue={bracket?.headline}
          error={errors.headline}
        />
        <TextArea
          name="expectations"
          label="What interviews expect (shown to students)"
          defaultValue={bracket?.expectations}
          error={errors.expectations}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function MixDialog({ bracket, onClose }: { bracket: AdminBracketDto; onClose: () => void }) {
  const [mix, setMix] = useState<DifficultyPolicy>(bracket.difficultyPolicy);
  const save = useMutation({
    mutationFn: () => api.put(`/catalog/brackets/${bracket.id}/difficulty-policy`, mix),
    onSuccess: () => {
      void refresh();
      onClose();
    },
  });
  return (
    <Dialog open onClose={onClose} title={`Practice difficulty mix · ${bracket.label}`}>
      <div className="grid gap-4">
        <p className="text-sm text-muted">
          Relative weights for picking practice questions at this package. A question tagged for
          this package always qualifies.
        </p>
        {DIFFS.map((d) => (
          <label key={d} className="grid grid-cols-[80px_1fr_48px] items-center gap-3 text-sm">
            <span className="font-mono text-xs font-semibold" style={{ color: DIFF_COLOR[d] }}>
              {d}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={mix[d]}
              onChange={(e) => setMix({ ...mix, [d]: Number(e.target.value) })}
            />
            <b className="text-right font-mono">{mix[d]}</b>
          </label>
        ))}
        <MixBar policy={mix} />
        {save.isError && <Alert tone="bad">{errorMessage(save.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            Save mix
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ───────────────────────────── Depth levels ─────────────────────────────

function DepthTab({ levels }: { levels: DepthLevelDto[] }) {
  return (
    <div className="grid gap-3">
      <Alert tone="info">
        The depth scale is used to tag lesson sections and to tell the content generator what
        genuinely changes at each level, so higher depth means more mechanism and trade-offs, not
        harder words.
      </Alert>
      {levels.map((l) => (
        <DepthRow key={l.rank} level={l} />
      ))}
    </div>
  );
}

function DepthRow({ level }: { level: DepthLevelDto }) {
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: (body: unknown) => api.patch(`/catalog/depth-levels/${level.rank}`, body),
    onSuccess: () => {
      setSaved(true);
      void refresh();
    },
  });
  return (
    <Card className="p-4">
      <form
        noValidate
        onChange={() => setSaved(false)}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          save.mutate({
            name: String(f.get('name')),
            description: String(f.get('description')),
            generationGuidance: String(f.get('generationGuidance')),
          });
        }}
        className="grid gap-3 md:grid-cols-[180px_1fr]"
      >
        <div>
          <span className="font-mono text-xs text-muted">Rank {level.rank}</span>
          <TextField name="name" label="Name" defaultValue={level.name} />
        </div>
        <div className="grid gap-3">
          <TextField
            name="description"
            label="Meaning (shown to admins)"
            defaultValue={level.description}
          />
          <TextArea
            name="generationGuidance"
            label="Generation guidance"
            rows={2}
            defaultValue={level.generationGuidance}
          />
          <div className="flex items-center gap-3">
            <Button size="sm" type="submit" variant="secondary" loading={save.isPending}>
              Save
            </Button>
            {saved && <span className="text-sm font-medium text-ok">Saved ✓</span>}
            {save.isError && (
              <span className="text-sm font-medium text-bad">{errorMessage(save.error)}</span>
            )}
          </div>
        </div>
      </form>
    </Card>
  );
}

// ───────────────────────────── Skill areas ─────────────────────────────

function SkillsTab({ areas }: { areas: SkillAreaDto[] }) {
  const [editing, setEditing] = useState<SkillAreaDto | 'new' | null>(null);
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/skill-areas/${id}`),
    onSuccess: refresh,
  });
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <p className="text-sm text-muted">
          Groups of topics students rate themselves on during onboarding.
        </p>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus className="size-3.5" aria-hidden /> New skill area
        </Button>
      </div>
      {del.isError && (
        <div className="px-4 pt-3">
          <Alert tone="bad">{errorMessage(del.error)}</Alert>
        </div>
      )}
      <Table minWidth={560}>
        <thead>
          <tr>
            <Th>Skill area</Th>
            <Th>Description</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {areas.map((a) => (
            <tr key={a.id}>
              <Td>
                <b>{a.name}</b>
                <span className="block font-mono text-xs text-muted">{a.slug}</span>
              </Td>
              <Td className="text-ink-2">{a.description}</Td>
              <Td className="text-right whitespace-nowrap">
                <Button size="sm" variant="ghost" onClick={() => setEditing(a)}>
                  <Pencil className="size-3.5" aria-hidden /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete ${a.name}`}
                  onClick={() => window.confirm(`Delete "${a.name}"?`) && del.mutate(a.id)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {editing && (
        <SkillDialog area={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </Card>
  );
}

function SkillDialog({ area, onClose }: { area: SkillAreaDto | null; onClose: () => void }) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const save = useMutation({
    mutationFn: (body: unknown) =>
      area
        ? api.patch(`/catalog/skill-areas/${area.id}`, body)
        : api.post('/catalog/skill-areas', body),
    onSuccess: () => {
      void refresh();
      onClose();
    },
    onError: (err) => setErrors(fromApiError(err).fields),
  });
  return (
    <Dialog open onClose={onClose} title={area ? `Edit ${area.name}` : 'New skill area'}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          save.mutate({
            name: String(f.get('name')),
            slug: String(f.get('slug')),
            description: String(f.get('description')),
            sortOrder: Number(f.get('sortOrder') || 0),
          });
        }}
        className="grid gap-4"
      >
        {save.isError && !Object.keys(errors).length && (
          <Alert tone="bad">{errorMessage(save.error)}</Alert>
        )}
        <TextField name="name" label="Name" defaultValue={area?.name} error={errors.name} />
        <TextField name="slug" label="Slug" defaultValue={area?.slug} error={errors.slug} />
        <TextArea
          name="description"
          label="Description (shown to students)"
          defaultValue={area?.description}
          error={errors.description}
        />
        <TextField
          name="sortOrder"
          type="number"
          label="Order"
          defaultValue={String(area?.sortOrder ?? 0)}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// ───────────────────────────── Companies ─────────────────────────────

function CompaniesTab({ companies }: { companies: AdminCatalogResponse['companies'] }) {
  const [name, setName] = useState('');
  const add = useMutation({
    mutationFn: () => api.post('/catalog/companies', { name }),
    onSuccess: () => {
      setName('');
      void refresh();
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/catalog/companies/${id}`),
    onSuccess: refresh,
  });
  return (
    <Card className="p-5">
      <p className="text-sm text-muted">
        Employers used for “asked at” tags on questions. Tags need a source; never inferred by AI.
      </p>
      <form
        className="mt-4 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) add.mutate();
        }}
      >
        <TextField
          label="Add company"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-64 flex-1"
        />
        <Button type="submit" loading={add.isPending} disabled={!name.trim()}>
          Add
        </Button>
      </form>
      {add.isError && (
        <div className="mt-3">
          <Alert tone="bad">{errorMessage(add.error)}</Alert>
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        {companies.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 py-1 pr-1 pl-3 text-sm"
          >
            {c.name}
            <button
              type="button"
              aria-label={`Remove ${c.name}`}
              onClick={() => window.confirm(`Remove ${c.name}?`) && del.mutate(c.id)}
              className="grid size-6 place-items-center rounded-md text-muted hover:bg-surface-3 hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
    </Card>
  );
}
