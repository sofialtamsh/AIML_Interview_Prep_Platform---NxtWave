import { LessonDocument } from '@app/content';
import { Alert, Button, Dialog, errorMessage } from '@app/ui';
import { useMutation } from '@tanstack/react-query';
import { FileJson } from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from '../../../lib/api';
import { IssueList } from './LessonWorkspace';
import { issuesOf } from './shared';

/** Paste or upload a lesson in the lesson JSON format. It becomes a draft for review. */
export function ImportDialog({
  open,
  onClose,
  subtopicId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  subtopicId: string;
  onCreated: (id: string) => void;
}) {
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const local = useMemo(() => {
    if (!text.trim()) return null;
    try {
      const r = LessonDocument.safeParse(JSON.parse(text));
      return r.success
        ? { ok: true as const, sections: r.data.sections.length, title: r.data.title }
        : {
            ok: false as const,
            issues: r.error.issues.map((i) => ({
              path: i.path.map(String).join('.') || '(document)',
              message: i.message,
            })),
          };
    } catch (err) {
      return { ok: false as const, issues: [{ path: '(json)', message: (err as Error).message }] };
    }
  }, [text]);
  const importIt = useMutation({
    mutationFn: () =>
      api.post<{ id: string }>(`/content/lessons/${subtopicId}/versions`, {
        source: 'IMPORT',
        document: JSON.parse(text),
        ...(note.trim() ? { changeNote: note.trim() } : {}),
      }),
    onSuccess: (r) => {
      setText('');
      setNote('');
      onCreated(r.id);
    },
  });

  return (
    <Dialog open={open} onClose={onClose} title="Import a lesson" wide>
      <div className="grid gap-3">
        <p className="text-[13px] text-ink-2">
          Paste the lesson JSON or choose a .json file. It is checked first, then saved as a draft.
          Nothing is shown to students until it is reviewed and published.
        </p>
        <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-line-2 px-3 py-1.5 text-[13px] font-semibold hover:border-ink-2">
          <FileJson className="size-4" aria-hidden /> Choose a file
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) setText(await file.text());
            }}
          />
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          rows={16}
          placeholder='{ "title": "…", "objectives": [ … ], "sections": [ … ] }'
          aria-label="Lesson JSON"
          className="w-full resize-y rounded-xl border border-line-2 bg-surface-2 px-3 py-2 font-mono text-[12px] outline-none focus:border-brand"
        />
        {local?.ok === true && (
          <span className="text-[12.5px] font-medium text-ok">
            Looks good: "{local.title}" with {local.sections} steps.
          </span>
        )}
        {local?.ok === false && <IssueList issues={local.issues} />}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note for the reviewer (optional)"
          maxLength={500}
          className="rounded-[10px] border border-line-2 bg-surface px-3 py-2 text-[14px] outline-none focus:border-brand"
        />
        {importIt.isError && (
          <>
            <Alert tone="bad">{errorMessage(importIt.error)}</Alert>
            <IssueList issues={issuesOf(importIt.error)} />
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => importIt.mutate()}
            loading={importIt.isPending}
            disabled={local?.ok !== true}
          >
            Import as draft
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
