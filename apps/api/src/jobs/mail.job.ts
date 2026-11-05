import type { Logger } from 'pino';
import type { Mailer, MailMessage } from '../mail/mailer.ts';

/** Worker handler for the mail queue. Throwing makes pg-boss retry the job with backoff. */
export async function deliverMail(
  jobs: Array<{ id: string; data: MailMessage }>,
  mailer: Mailer,
  log: Logger,
) {
  for (const job of jobs) {
    await mailer.send(job.data);
    log.info({ jobId: job.id, tag: job.data.tag }, 'email delivered');
  }
}
