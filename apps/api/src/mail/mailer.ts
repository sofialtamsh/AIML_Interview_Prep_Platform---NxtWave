import { createTransport, type Transporter } from 'nodemailer';
import type { Env } from '../config/env.ts';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Short label for logs, e.g. "email-verification". */
  tag: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export class SmtpMailer implements Mailer {
  private readonly transport: Transporter;
  private readonly from: string;

  constructor(env: Env) {
    this.from = env.MAIL_FROM;
    this.transport = createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } : undefined,
      // Fail fast; the mail queue retries with backoff.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      headers: { 'X-Mail-Tag': message.tag },
    });
  }
}

/** Keeps messages in memory. Used by tests to read verification/reset links. */
export class MemoryMailer implements Mailer {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }

  last(to?: string): MailMessage | undefined {
    const list = to ? this.sent.filter((m) => m.to === to) : this.sent;
    return list.at(-1);
  }
}

/** Minimal slice of pg-boss used for enqueueing (keeps the mailer easy to test). */
export interface JobSender {
  send(name: string, data: object): Promise<string | null>;
}

/** Enqueues email for the worker. The API's request path only pays for one INSERT. */
export class QueuedMailer implements Mailer {
  constructor(
    private readonly boss: JobSender,
    private readonly queue: string,
  ) {}

  async send(message: MailMessage): Promise<void> {
    await this.boss.send(this.queue, message);
  }
}
