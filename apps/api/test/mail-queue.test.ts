import { describe, expect, it } from 'vitest';
import { env } from '../src/config/env.ts';
import { deliverMail } from '../src/jobs/mail.job.ts';
import { createLogger } from '../src/lib/logger.ts';
import { type MailMessage, MemoryMailer, QueuedMailer } from '../src/mail/mailer.ts';

const msg: MailMessage = {
  to: 'a@b.co',
  subject: 'Hi',
  text: 'Hi',
  html: '<p>Hi</p>',
  tag: 'test',
};

describe('mail queue', () => {
  it('the API side only enqueues (never talks to SMTP)', async () => {
    const sent: Array<[string, object]> = [];
    const mailer = new QueuedMailer(
      {
        send: async (n, d) => {
          sent.push([n, d]);
          return 'job-1';
        },
      },
      'mail.send',
    );
    await mailer.send(msg);
    expect(sent).toEqual([['mail.send', msg]]);
  });

  it('the worker delivers each queued message', async () => {
    const smtp = new MemoryMailer();
    await deliverMail(
      [
        { id: '1', data: msg },
        { id: '2', data: { ...msg, to: 'c@d.co' } },
      ],
      smtp,
      createLogger(env, 'test'),
    );
    expect(smtp.sent.map((m) => m.to)).toEqual(['a@b.co', 'c@d.co']);
  });

  it('a delivery failure is thrown so the queue retries it', async () => {
    const failing = { send: async () => Promise.reject(new Error('SMTP down')) };
    await expect(
      deliverMail([{ id: '1', data: msg }], failing, createLogger(env, 'test')),
    ).rejects.toThrow('SMTP down');
  });
});
