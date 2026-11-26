import { api } from '../../../lib/api';

type Props = Record<string, string | number | boolean | null>;

/**
 * The page this hub came from counted clicks anonymously, in a spreadsheet. Here the student is
 * signed in, so the two clicks that matter (opening a question on the Academy, opening its
 * concept video) are recorded against their account for the team's analytics. Every other event
 * name the hub's components send is ignored. Recording never delays or breaks the click.
 */
const KINDS: Record<string, 'PRACTICE_SOLVE' | 'PRACTICE_CONCEPT'> = {
  solve_clicked: 'PRACTICE_SOLVE',
  concept_clicked: 'PRACTICE_CONCEPT',
};

export function track(event: string, props: Props = {}) {
  const kind = KINDS[event];
  if (!kind) return;
  const target = typeof props.id === 'string' ? props.id : undefined;
  void api.post('/student/activity', { kind, ...(target ? { target } : {}) }).catch(() => {
    // Analytics must never break the page.
  });
}
