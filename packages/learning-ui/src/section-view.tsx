import type { SectionKind, StudentSection } from '@app/content';
import { cn } from '@app/ui';
import { CheckCircle2, Clock, FastForward } from 'lucide-react';
import { KnowledgeCheckView } from './sections/check';
import { CodeExampleView, CodeExplorerView, PlaygroundView } from './sections/code-sections';
import {
  CalloutView,
  CardDeckView,
  DiagramView,
  ExplanationView,
  HookView,
  InterviewPlaybookView,
  SummaryView,
} from './sections/explain';
import { WidgetView } from './sections/widgets';

/** What each kind of step is called in the player. */
export const KIND_LABEL: Record<SectionKind, string> = {
  HOOK: 'Start here',
  EXPLANATION: 'The idea',
  CARD_DECK: 'Explore',
  DIAGRAM: 'See it',
  CODE_EXAMPLE: 'Code',
  CODE_EXPLORER: 'Explore the code',
  WIDGET: 'Play with it',
  KNOWLEDGE_CHECK: 'Quick check',
  PLAYGROUND: 'Your turn',
  CALLOUT: 'Good to know',
  INTERVIEW_PLAYBOOK: 'In the interview',
  SUMMARY: 'Wrap-up',
};

const DEFAULT_TITLE: Partial<Record<SectionKind, string>> = {
  HOOK: 'Why this matters',
  KNOWLEDGE_CHECK: 'Quick check',
  SUMMARY: 'What to remember',
  INTERVIEW_PLAYBOOK: 'How to answer it',
};

export function sectionTitle(
  s: Pick<StudentSection, 'kind' | 'title'> & { body: unknown },
): string {
  if (s.title) return s.title;
  if (s.kind === 'CALLOUT') return (s.body as { title: string }).title;
  return DEFAULT_TITLE[s.kind] ?? KIND_LABEL[s.kind];
}

export function SectionHeader({
  section,
  done = false,
  className,
}: {
  section: StudentSection;
  done?: boolean;
  className?: string;
}) {
  return (
    <header className={cn('grid gap-1.5', className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="eyebrow text-brand">{KIND_LABEL[section.kind]}</span>
        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted">
          <Clock className="size-3" aria-hidden /> {section.estimatedMinutes} min
        </span>
        {section.fastTrack && (
          <span className="inline-flex items-center gap-1 rounded-md bg-g3/15 px-1.5 py-px font-mono text-[10.5px] font-bold tracking-wide text-g3 uppercase">
            <FastForward className="size-3" aria-hidden /> Quick refresher
          </span>
        )}
        {done && (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-ok">
            <CheckCircle2 className="size-3" aria-hidden /> Done
          </span>
        )}
      </div>
      {section.kind !== 'CALLOUT' && (
        <h2 className="text-[clamp(19px,2.2vw,24px)]">{sectionTitle(section)}</h2>
      )}
    </header>
  );
}

/** Renders one lesson step. The same component serves students and the admin preview. */
export function SectionBody({ section }: { section: StudentSection }) {
  switch (section.kind) {
    case 'HOOK':
      return <HookView s={section} />;
    case 'EXPLANATION':
      return <ExplanationView s={section} />;
    case 'CARD_DECK':
      return <CardDeckView s={section} />;
    case 'DIAGRAM':
      return <DiagramView s={section} />;
    case 'CODE_EXAMPLE':
      return <CodeExampleView s={section} />;
    case 'CODE_EXPLORER':
      return <CodeExplorerView s={section} />;
    case 'WIDGET':
      return <WidgetView s={section} />;
    case 'KNOWLEDGE_CHECK':
      return <KnowledgeCheckView s={section} />;
    case 'PLAYGROUND':
      return <PlaygroundView s={section} />;
    case 'CALLOUT':
      return <CalloutView s={section} />;
    case 'INTERVIEW_PLAYBOOK':
      return <InterviewPlaybookView s={section} />;
    case 'SUMMARY':
      return <SummaryView s={section} />;
  }
}
