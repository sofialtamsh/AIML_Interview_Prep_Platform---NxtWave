/** How the API hands AI jobs to the worker. The job's own state lives in `agent_job`. */
export interface JobQueue {
  enqueue(queue: string, data: { jobId: string }): Promise<void>;
}

export const AI_QUEUES = {
  generate: 'ai.lesson.generate',
  evaluate: 'ai.lesson.evaluate',
  rewrite: 'ai.section.rewrite',
} as const;

/** pg-boss behind the interface. AI jobs are not retried automatically: an admin decides. */
export class BossJobQueue implements JobQueue {
  constructor(
    private readonly boss: { send(name: string, data: object): Promise<string | null> },
  ) {}

  async enqueue(queue: string, data: { jobId: string }) {
    await this.boss.send(queue, data);
  }
}

/** Tests: remembers what was queued so the test can run it. */
export class MemoryJobQueue implements JobQueue {
  readonly sent: Array<{ queue: string; jobId: string }> = [];

  async enqueue(queue: string, data: { jobId: string }) {
    this.sent.push({ queue, jobId: data.jobId });
  }

  take(): Array<{ queue: string; jobId: string }> {
    return this.sent.splice(0);
  }
}

/** For processes that never queue jobs (CLIs). */
export const noJobQueue: JobQueue = {
  async enqueue() {
    throw new Error('This process cannot queue background jobs');
  },
};
