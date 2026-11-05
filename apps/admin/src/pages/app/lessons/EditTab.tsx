import {
  estimateSectionMinutes,
  LessonDocument,
  Section,
  type Section as SectionT,
  toStudentSection,
} from '@app/content';
import type { ContentIssue, LessonModuleResponse, LessonVersionResponse } from '@app/contracts';
import {
  KIND_LABEL,
  LessonRuntimeProvider,
  SectionBody,
  SectionHeader,
  sectionTitle,
} from '@app/learning-ui';
import { Alert, Badge, Button, Card, Dialog, errorMessage } from '@app/ui';
import { useMutation } from '@tanstack/react-query';
import { Braces, Download, PencilLine, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from '../../../lib/api';
import { IssueList } from './LessonWorkspace';
import { downloadJson, issuesOf, previewRuntime } from './shared';

const zodIssues = (
  error: { issues: Array<{ path: PropertyKey[]; message: string }> },
  prefix: string[] = [],
) =>
  error.issues.map((i) => ({
    path: [...prefix, ...i.path.map(String)].join('.') || '(document)',
    message: i.message,
  }));

export function EditTab({
  v,
  module,
  onSaved,
  onRewrite,
}: {
  v: LessonVersionResponse;
  module: LessonModuleResponse;
  onSaved: (v: LessonVersionResponse) => void;
  onRewrite?: (key: string, title: string) => void;
}) {
  const [editing, setEditing] = useState<SectionT | null>(null);
  const [wholeOpen, setWholeOpen] = useState(false);
  const editable = v.version.editable;
  const change = new Map(v.sections.map((s) => [s.key, s.change]));

  return (
    <div className="grid gap-4">
      {!editable && (
        <Alert tone="info">
          {v.version.status === 'UNDER_REVIEW'
            ? 'This version is under review, so it is read-only. A reviewer can send it back to draft.'
            : 'Only drafts can be edited. Use "Start a new draft" above to make changes to this version.'}
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        {editable && (
          <Button size="sm" variant="secondary" onClick={() => setWholeOpen(true)}>
            <Braces className="size-3.5" aria-hidden /> Edit the full JSON
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            downloadJson(`${module.subtopic.slug}.v${v.version.versionNumber}.json`, v.document)
          }
        >
          <Download className="size-3.5" aria-hidden /> Download JSON
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="text-left font-mono text-[10.5px] tracking-wider text-muted uppercase">
              <th className="border-b border-line px-3 py-2.5">#</th>
              <th className="border-b border-line px-3 py-2.5">Step</th>
              <th className="border-b border-line px-3 py-2.5">Kind</th>
              <th className="border-b border-line px-3 py-2.5">Depth</th>
              <th className="border-b border-line px-3 py-2.5">Min</th>
              <th className="border-b border-line px-3 py-2.5">Concepts</th>
              <th className="border-b border-line px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {v.document.sections.map((s, i) => (
              <tr key={s.key} className="border-b border-line last:border-0">
                <td className="px-3 py-2 font-mono text-[11px] text-muted">{i + 1}</td>
                <td className="px-3 py-2">
                  <div className="font-semibold">{sectionTitle(s)}</div>
                  <div className="font-mono text-[11px] text-muted">
                    {s.key}
                    {s.slotKey && ` · slot ${s.slotKey}`}
                    {s.roleScope.length > 0 && ` · only ${s.roleScope.join(', ')}`}
                  </div>
                </td>
                <td className="px-3 py-2">{KIND_LABEL[s.kind]}</td>
                <td className="px-3 py-2 font-mono">≥ {s.depthRank}</td>
                <td className="px-3 py-2 font-mono">{estimateSectionMinutes(s)}</td>
                <td className="max-w-[14rem] truncate px-3 py-2 text-[12px] text-muted">
                  {s.conceptKeys.join(', ')}
                </td>
                <td className="px-3 py-2 text-right">
                  <span className="mr-2">
                    {module.publishedVersionId &&
                      module.publishedVersionId !== v.version.id &&
                      change.get(s.key) !== 'UNCHANGED' && (
                        <Badge tone={change.get(s.key) === 'ADDED' ? 'next' : 'warn'}>
                          {change.get(s.key) === 'ADDED' ? 'New' : 'Changed'}
                        </Badge>
                      )}
                  </span>
                  {onRewrite && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRewrite(s.key, sectionTitle(s))}
                    >
                      <Wand2 className="size-3.5" aria-hidden /> Rewrite
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
                    <PencilLine className="size-3.5" aria-hidden /> {editable ? 'Edit' : 'View'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {v.removedKeys.length > 0 && (
        <p className="text-[12.5px] text-muted">
          Removed compared with the live version: {v.removedKeys.join(', ')}
        </p>
      )}

      {editing && (
        <SectionEditor
          key={editing.key}
          v={v}
          section={editing}
          editable={editable}
          onClose={() => setEditing(null)}
          onSaved={(r) => {
            setEditing(null);
            onSaved(r);
          }}
        />
      )}
      {wholeOpen && (
        <DocumentEditor
          v={v}
          onClose={() => setWholeOpen(false)}
          onSaved={(r) => {
            setWholeOpen(false);
            onSaved(r);
          }}
        />
      )}
    </div>
  );
}

function SectionEditor({
  v,
  section,
  editable,
  onClose,
  onSaved,
}: {
  v: LessonVersionResponse;
  section: SectionT;
  editable: boolean;
  onClose: () => void;
  onSaved: (v: LessonVersionResponse) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(section, null, 2));
  const index = v.document.sections.findIndex((s) => s.key === section.key);
  const parsed = useMemo(() => {
    try {
      const r = Section.safeParse(JSON.parse(text));
      return r.success
        ? { ok: true as const, section: r.data }
        : { ok: false as const, issues: zodIssues(r.error, ['sections', String(index)]) };
    } catch (err) {
      return { ok: false as const, issues: [{ path: '(json)', message: (err as Error).message }] };
    }
  }, [text, index]);
  const save = useMutation({
    mutationFn: () =>
      api.put<LessonVersionResponse>(`/content/versions/${v.version.id}/sections/${section.key}`, {
        editSeq: v.version.editSeq,
        section: JSON.parse(text),
      }),
    onSuccess: onSaved,
  });
  const runtime = useMemo(() => previewRuntime(v.document), [v.document]);
  const serverIssues: ContentIssue[] = save.isError ? issuesOf(save.error) : [];

  return (
    <Dialog
      open
      onClose={onClose}
      title={`${editable ? 'Edit' : 'View'} step: ${section.key}`}
      wide
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid content-start gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            readOnly={!editable}
            spellCheck={false}
            rows={24}
            aria-label="Section JSON"
            className="w-full resize-y rounded-xl border border-line-2 bg-surface-2 px-3 py-2 font-mono text-[12px] leading-[1.55] outline-none focus:border-brand"
          />
          {parsed.ok ? (
            <span className="text-[12px] font-medium text-ok">
              Valid. The preview shows what students will see.
            </span>
          ) : (
            <IssueList issues={parsed.issues} />
          )}
        </div>
        <div className="grid min-w-0 content-start gap-3 rounded-xl border border-line p-4">
          <span className="eyebrow">Live preview</span>
          {parsed.ok && (
            <LessonRuntimeProvider value={runtime}>
              <SectionHeader
                section={toStudentSection(parsed.section, {
                  revisionId: 'preview',
                  estimatedMinutes: estimateSectionMinutes(parsed.section),
                  fastTrack: false,
                })}
              />
              <SectionBody
                section={toStudentSection(parsed.section, {
                  revisionId: 'preview',
                  estimatedMinutes: estimateSectionMinutes(parsed.section),
                  fastTrack: false,
                })}
              />
            </LessonRuntimeProvider>
          )}
        </div>
      </div>
      {save.isError && (
        <div className="mt-4 grid gap-2">
          <Alert tone="bad">{errorMessage(save.error)}</Alert>
          <IssueList issues={serverIssues} />
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          {editable ? 'Cancel' : 'Close'}
        </Button>
        {editable && (
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!parsed.ok}>
            Save step
          </Button>
        )}
      </div>
    </Dialog>
  );
}

function DocumentEditor({
  v,
  onClose,
  onSaved,
}: {
  v: LessonVersionResponse;
  onClose: () => void;
  onSaved: (v: LessonVersionResponse) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(v.document, null, 2));
  const local = useMemo(() => {
    try {
      const r = LessonDocument.safeParse(JSON.parse(text));
      return r.success ? [] : zodIssues(r.error);
    } catch (err) {
      return [{ path: '(json)', message: (err as Error).message }];
    }
  }, [text]);
  const save = useMutation({
    mutationFn: () =>
      api.put<LessonVersionResponse>(`/content/versions/${v.version.id}/document`, {
        editSeq: v.version.editSeq,
        document: JSON.parse(text),
      }),
    onSuccess: onSaved,
  });
  return (
    <Dialog open onClose={onClose} title="Edit the full lesson JSON" wide>
      <div className="grid gap-3">
        <p className="text-[13px] text-ink-2">
          Reorder, add or remove steps here. Unchanged steps keep their history; only edited steps
          get a new revision.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          rows={26}
          aria-label="Lesson JSON"
          className="w-full resize-y rounded-xl border border-line-2 bg-surface-2 px-3 py-2 font-mono text-[12px] leading-[1.55] outline-none focus:border-brand"
        />
        {local.length > 0 ? (
          <IssueList issues={local} />
        ) : (
          <span className="text-[12px] font-medium text-ok">Valid lesson JSON.</span>
        )}
        {save.isError && (
          <>
            <Alert tone="bad">{errorMessage(save.error)}</Alert>
            <IssueList issues={issuesOf(save.error)} />
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => save.mutate()}
            loading={save.isPending}
            disabled={local.length > 0}
          >
            Save lesson
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
