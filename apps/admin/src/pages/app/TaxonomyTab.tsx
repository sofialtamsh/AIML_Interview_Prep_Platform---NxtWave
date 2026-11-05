import type { AdminCatalogResponse, SubtopicDto, TaxonomyResponse, TopicDto } from '@app/contracts';
import {
  Alert,
  Badge,
  Button,
  Card,
  Chip,
  Dialog,
  errorMessage,
  type FieldErrors,
  fromApiError,
  SelectField,
  TextArea,
  TextField,
} from '@app/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api, queryClient } from '../../lib/api';
import { curriculumKeys } from '../../lib/curriculum';

const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'curriculum'] });

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

const COMPLEXITY = [
  { value: '1', label: '1 · Light' },
  { value: '2', label: '2 · Easy' },
  { value: '3', label: '3 · Standard' },
  { value: '4', label: '4 · Demanding' },
  { value: '5', label: '5 · Heavy' },
];

/** Topics and subtopics are shared by every role; curricula pick from them. */
export function TaxonomyTab({
  catalog,
  taxonomy,
}: {
  catalog: AdminCatalogResponse;
  taxonomy: TaxonomyResponse;
}) {
  const [topic, setTopic] = useState<TopicDto | 'new' | null>(null);
  const [sub, setSub] = useState<{ topicId: string; subtopic: SubtopicDto | null } | null>(null);
  const titleOf = new Map(
    taxonomy.topics.flatMap((t) => [
      [t.id, t.title] as const,
      ...t.subtopics.map((s) => [s.id, s.title] as const),
    ]),
  );
  const area = new Map(catalog.skillAreas.map((a) => [a.id, a.name]));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[70ch] text-sm text-muted">
          Prerequisites decide the order students learn in. Loops are rejected, so the planner can
          always find a valid order.
        </p>
        <Button size="sm" onClick={() => setTopic('new')}>
          <Plus className="size-3.5" aria-hidden /> New topic
        </Button>
      </div>

      {taxonomy.topics.map((t) => (
        <Card key={t.id} className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base">{t.title}</h2>
                <span className="font-mono text-xs text-muted">{t.slug}</span>
                {t.status === 'ARCHIVED' && <Badge tone="hidden">Archived</Badge>}
              </div>
              <p className="mt-1 max-w-[80ch] text-[13px] text-ink-2">{t.summary}</p>
              <p className="mt-1.5 text-[12.5px] text-muted">
                {t.skillAreaId ? area.get(t.skillAreaId) : 'No skill area'}
                {t.prerequisiteIds.length > 0 &&
                  ` · after ${t.prerequisiteIds.map((p) => titleOf.get(p)).join(', ')}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setTopic(t)}>
                <Pencil className="size-3.5" aria-hidden /> Edit
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSub({ topicId: t.id, subtopic: null })}
              >
                <Plus className="size-3.5" aria-hidden /> Subtopic
              </Button>
            </div>
          </div>
          <ul className="divide-y divide-line">
            {t.subtopics.map((s) => (
              <li key={s.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-[14px] font-semibold">{s.title}</b>
                    <span className="font-mono text-[11.5px] text-muted">{s.slug}</span>
                    {s.status === 'ARCHIVED' && <Badge tone="hidden">Archived</Badge>}
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    Complexity {s.complexity}/5 · {s.concepts.length} concepts
                    {s.prerequisiteIds.length > 0 &&
                      ` · needs ${s.prerequisiteIds.map((p) => titleOf.get(p)).join(', ')}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSub({ topicId: t.id, subtopic: s })}
                  aria-label={`Edit ${s.title}`}
                >
                  <Pencil className="size-3.5" aria-hidden /> Edit
                </Button>
              </li>
            ))}
            {t.subtopics.length === 0 && (
              <li className="px-5 py-4 text-sm text-muted">No subtopics yet.</li>
            )}
          </ul>
        </Card>
      ))}

      {topic && (
        <TopicDialog
          topic={topic === 'new' ? null : topic}
          taxonomy={taxonomy}
          catalog={catalog}
          onClose={() => setTopic(null)}
        />
      )}
      {sub && (
        <SubtopicDialog
          topicId={sub.topicId}
          subtopic={sub.subtopic}
          taxonomy={taxonomy}
          onClose={() => setSub(null)}
        />
      )}
    </div>
  );
}

function PrereqPicker({
  options,
  value,
  onChange,
  error,
}: {
  options: Array<{ group?: string; id: string; title: string }>;
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  const groups = [...new Set(options.map((o) => o.group ?? ''))];
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-[13px] font-semibold">Comes after</legend>
      {groups.map((g) => (
        <div key={g} className="grid gap-1.5">
          {g && <span className="text-[12px] text-muted">{g}</span>}
          <div className="flex flex-wrap gap-1.5">
            {options
              .filter((o) => (o.group ?? '') === g)
              .map((o) => {
                const on = value.includes(o.id);
                return (
                  <Chip
                    key={o.id}
                    selected={on}
                    onClick={() =>
                      onChange(on ? value.filter((v) => v !== o.id) : [...value, o.id])
                    }
                  >
                    {o.title}
                  </Chip>
                );
              })}
          </div>
        </div>
      ))}
      {options.length === 0 && <p className="text-[13px] text-muted">Nothing to pick yet.</p>}
      {error && <p className="text-[13px] font-medium text-bad">{error}</p>}
    </fieldset>
  );
}

function TopicDialog({
  topic,
  taxonomy,
  catalog,
  onClose,
}: {
  topic: TopicDto | null;
  taxonomy: TaxonomyResponse;
  catalog: AdminCatalogResponse;
  onClose: () => void;
}) {
  const [v, setV] = useState({
    title: topic?.title ?? '',
    slug: topic?.slug ?? '',
    summary: topic?.summary ?? '',
    iconKey: topic?.iconKey ?? 'book-open',
    skillAreaId: topic?.skillAreaId ?? '',
    sortOrder: String(topic?.sortOrder ?? (taxonomy.topics.length + 1) * 10),
    status: topic?.status ?? 'ACTIVE',
    prerequisiteIds: topic?.prerequisiteIds ?? [],
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...v,
        skillAreaId: v.skillAreaId || null,
        sortOrder: Number(v.sortOrder) || 0,
      };
      return topic
        ? api.patch(`/curriculum/topics/${topic.id}`, body)
        : api.post('/curriculum/topics', body);
    },
    onSuccess: async () => {
      await refresh();
      onClose();
    },
    onError: (err) => setErrors(fromApiError(err).fields),
  });

  return (
    <Dialog open onClose={onClose} title={topic ? `Edit ${topic.title}` : 'New topic'} wide>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Title"
            value={v.title}
            error={errors.title}
            onChange={(e) =>
              setV({
                ...v,
                title: e.target.value,
                slug: topic ? v.slug : slugify(e.target.value),
              })
            }
          />
          <TextField
            label="Slug"
            value={v.slug}
            error={errors.slug}
            onChange={(e) => setV({ ...v, slug: e.target.value })}
            hint="Used in links, e.g. /topics/rag"
          />
        </div>
        <TextArea
          label="Summary (shown to students)"
          rows={2}
          value={v.summary}
          error={errors.summary}
          onChange={(e) => setV({ ...v, summary: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-4">
          <SelectField
            label="Skill area"
            className="sm:col-span-2"
            value={v.skillAreaId}
            onChange={(e) => setV({ ...v, skillAreaId: e.target.value })}
            options={[
              { value: '', label: 'None' },
              ...catalog.skillAreas.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
          <TextField
            label="Order"
            inputMode="numeric"
            value={v.sortOrder}
            onChange={(e) => setV({ ...v, sortOrder: e.target.value.replace(/\D/g, '') })}
          />
          <SelectField
            label="Status"
            value={v.status}
            onChange={(e) => setV({ ...v, status: e.target.value as 'ACTIVE' | 'ARCHIVED' })}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'ARCHIVED', label: 'Archived' },
            ]}
          />
        </div>
        <TextField
          label="Icon"
          value={v.iconKey}
          onChange={(e) => setV({ ...v, iconKey: e.target.value })}
          hint="A Lucide icon name: grid-3x3, scan-search, library or book-open."
        />
        <PrereqPicker
          options={taxonomy.topics
            .filter((t) => t.id !== topic?.id)
            .map((t) => ({ id: t.id, title: t.title }))}
          value={v.prerequisiteIds}
          onChange={(ids) => setV({ ...v, prerequisiteIds: ids })}
          error={errors.prerequisiteIds}
        />
        {save.isError && Object.keys(errors).length === 0 && (
          <Alert tone="bad">{errorMessage(save.error)}</Alert>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {topic ? 'Save topic' : 'Create topic'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function SubtopicDialog({
  topicId,
  subtopic,
  taxonomy,
  onClose,
}: {
  topicId: string;
  subtopic: SubtopicDto | null;
  taxonomy: TaxonomyResponse;
  onClose: () => void;
}) {
  const siblings = taxonomy.topics.find((t) => t.id === topicId)?.subtopics ?? [];
  const [v, setV] = useState({
    title: subtopic?.title ?? '',
    slug: subtopic?.slug ?? '',
    summary: subtopic?.summary ?? '',
    complexity: String(subtopic?.complexity ?? 3),
    sortOrder: String(subtopic?.sortOrder ?? (siblings.length + 1) * 10),
    status: subtopic?.status ?? 'ACTIVE',
    prerequisiteIds: subtopic?.prerequisiteIds ?? [],
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...v,
        complexity: Number(v.complexity),
        sortOrder: Number(v.sortOrder) || 0,
      };
      return subtopic
        ? api.patch(`/curriculum/subtopics/${subtopic.id}`, body)
        : api.post('/curriculum/subtopics', { ...body, topicId });
    },
    onSuccess: async () => {
      await refresh();
      onClose();
    },
    onError: (err) => setErrors(fromApiError(err).fields),
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={subtopic ? `Edit ${subtopic.title}` : 'New subtopic'}
      wide
    >
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Title"
            value={v.title}
            error={errors.title}
            onChange={(e) =>
              setV({
                ...v,
                title: e.target.value,
                slug: subtopic ? v.slug : slugify(e.target.value),
              })
            }
          />
          <TextField
            label="Slug"
            value={v.slug}
            error={errors.slug}
            onChange={(e) => setV({ ...v, slug: e.target.value })}
          />
        </div>
        <TextArea
          label="Summary (shown to students)"
          rows={2}
          value={v.summary}
          error={errors.summary}
          onChange={(e) => setV({ ...v, summary: e.target.value })}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Complexity"
            value={v.complexity}
            onChange={(e) => setV({ ...v, complexity: e.target.value })}
            options={COMPLEXITY}
          />
          <TextField
            label="Order in topic"
            inputMode="numeric"
            value={v.sortOrder}
            onChange={(e) => setV({ ...v, sortOrder: e.target.value.replace(/\D/g, '') })}
          />
          <SelectField
            label="Status"
            value={v.status}
            onChange={(e) => setV({ ...v, status: e.target.value as 'ACTIVE' | 'ARCHIVED' })}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'ARCHIVED', label: 'Archived' },
            ]}
          />
        </div>
        <PrereqPicker
          options={taxonomy.topics.flatMap((t) =>
            t.subtopics
              .filter((s) => s.id !== subtopic?.id)
              .map((s) => ({ group: t.title, id: s.id, title: s.title })),
          )}
          value={v.prerequisiteIds}
          onChange={(ids) => setV({ ...v, prerequisiteIds: ids })}
          error={errors.prerequisiteIds}
        />
        {save.isError && Object.keys(errors).length === 0 && (
          <Alert tone="bad">{errorMessage(save.error)}</Alert>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {subtopic ? 'Save subtopic' : 'Create subtopic'}
          </Button>
        </div>
      </form>
      {subtopic && <Concepts subtopic={subtopic} />}
    </Dialog>
  );
}

/** Concepts are the finest skill tags: lessons and questions will link to them. */
function Concepts({ subtopic }: { subtopic: SubtopicDto }) {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const add = useMutation({
    mutationFn: () =>
      api.post('/curriculum/concepts', {
        subtopicId: subtopic.id,
        key,
        name,
        sortOrder: (subtopic.concepts.length + 1) * 10,
      }),
    onSuccess: async () => {
      setKey('');
      setName('');
      setErrors({});
      await queryClient.invalidateQueries({ queryKey: curriculumKeys.taxonomy });
    },
    onError: (err) => setErrors(fromApiError(err).fields),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/curriculum/concepts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: curriculumKeys.taxonomy }),
  });
  // The dialog holds a snapshot of the subtopic; subscribe to the taxonomy for live concepts.
  const taxonomy = useQuery({
    queryKey: curriculumKeys.taxonomy,
    queryFn: () => api.get<TaxonomyResponse>('/curriculum/taxonomy'),
  });
  const live =
    taxonomy.data?.topics.flatMap((t) => t.subtopics).find((s) => s.id === subtopic.id)?.concepts ??
    subtopic.concepts;

  return (
    <section className="mt-6 border-t border-line pt-5">
      <h3 className="text-[15px]">Concepts</h3>
      <ul className="mt-2 grid gap-1.5">
        {live.map((c) => (
          <li key={c.id} className="flex items-center gap-3 text-sm">
            <span className="min-w-0 flex-1">
              {c.name} <span className="font-mono text-[11.5px] text-muted">{c.key}</span>
            </span>
            <button
              type="button"
              onClick={() => remove.mutate(c.id)}
              className="grid size-7 place-items-center rounded-md text-muted hover:bg-bad-bg hover:text-bad"
              aria-label={`Delete ${c.name}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <TextField
          label="Key"
          placeholder="rag.chunking.overlap"
          value={key}
          error={errors.key}
          onChange={(e) => setKey(e.target.value)}
        />
        <TextField
          label="Name"
          value={name}
          error={errors.name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" variant="secondary" loading={add.isPending}>
          Add
        </Button>
      </form>
    </section>
  );
}
