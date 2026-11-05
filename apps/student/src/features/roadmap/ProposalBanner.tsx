import type { RoadmapResponse, RoadmapVersionDto } from '@app/contracts';
import { Alert, Button, Dialog, errorMessage } from '@app/ui';
import { useMutation } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../lib/api';
import { setRoadmap } from '../../lib/queries';
import { ChangeList } from './parts';

/**
 * Admins updated the curriculum for this student's target. The student sees exactly what would
 * change and decides; their plan stays as it is until they accept.
 */
export function ProposalBanner({ proposal }: { proposal: RoadmapVersionDto }) {
  const [open, setOpen] = useState(false);
  const decide = useMutation({
    mutationFn: (choice: 'accept' | 'decline') =>
      api.post<RoadmapResponse>(`/student/roadmap/proposal/${choice}`),
    onSuccess: (r) => {
      setRoadmap(r);
      setOpen(false);
    },
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-brand/25 bg-brand-soft px-4 py-3.5">
        <Sparkles className="size-5 shrink-0 text-brand" aria-hidden />
        <div className="min-w-0 flex-1">
          <b className="block text-[14.5px] text-brand-deep">Your roadmap has an update</b>
          <span className="text-[13px] text-ink-2">
            Our content team refreshed what your target needs. Have a look before anything changes.
          </span>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          See what changes
        </Button>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="What changes in your roadmap">
        <div className="grid gap-5">
          {proposal.changeSummary && <ChangeList summary={proposal.changeSummary} />}
          <p className="text-[13px] text-muted">
            If you update, the plan is rebuilt from today. Anything you have finished stays done.
          </p>
          {decide.isError && <Alert tone="bad">{errorMessage(decide.error)}</Alert>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              loading={decide.isPending && decide.variables === 'decline'}
              onClick={() => decide.mutate('decline')}
            >
              Keep my current plan
            </Button>
            <Button
              loading={decide.isPending && decide.variables === 'accept'}
              onClick={() => decide.mutate('accept')}
            >
              Update my roadmap
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
