import type { MailMessage } from './mailer.ts';

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

/** One simple, accessible layout for every transactional email. */
function layout(
  appName: string,
  heading: string,
  paragraphs: string[],
  cta?: { label: string; url: string },
) {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6">${esc(p)}</p>`)
    .join('');
  const button = cta
    ? `<p style="margin:22px 0"><a href="${esc(cta.url)}" style="background:#1F5BFF;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;display:inline-block">${esc(cta.label)}</a></p>
       <p style="margin:0 0 14px;font-size:13px;color:#6A778E">If the button does not work, copy this link into your browser:<br><span style="word-break:break-all">${esc(cta.url)}</span></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#F7F8FB;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0B1526">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="font-weight:800;font-size:15px;margin-bottom:20px"><span style="background:#1F5BFF;color:#fff;border-radius:8px;padding:4px 9px;margin-right:8px">N</span>${esc(appName)}</div>
    <div style="background:#fff;border:1px solid #E2E7EF;border-radius:14px;padding:26px">
      <h1 style="font-size:20px;margin:0 0 16px">${esc(heading)}</h1>${body}${button}
    </div>
    <p style="font-size:12px;color:#6A778E;margin-top:18px">You received this email because of activity on your ${esc(appName)} account. If this was not you, you can ignore this email.</p>
  </div></body></html>`;
}

function text(heading: string, paragraphs: string[], cta?: { label: string; url: string }) {
  return [heading, '', ...paragraphs, ...(cta ? ['', `${cta.label}: ${cta.url}`] : [])].join('\n');
}

function build(
  tag: string,
  to: string,
  appName: string,
  subject: string,
  heading: string,
  paragraphs: string[],
  cta?: { label: string; url: string },
): MailMessage {
  return {
    tag,
    to,
    subject,
    html: layout(appName, heading, paragraphs, cta),
    text: text(heading, paragraphs, cta),
  };
}

export const emails = {
  verification: (appName: string, to: string, name: string, url: string) =>
    build(
      'email-verification',
      to,
      appName,
      `Confirm your email for ${appName}`,
      `Hi ${name}, confirm your email`,
      ['Tap the button below to confirm this is your email address. The link works for 24 hours.'],
      { label: 'Confirm my email', url },
    ),

  passwordReset: (appName: string, to: string, url: string) =>
    build(
      'password-reset',
      to,
      appName,
      `Reset your ${appName} password`,
      'Reset your password',
      [
        'We got a request to reset your password. The link works for 1 hour and can be used once.',
        'If you did not ask for this, you can ignore this email. Your password stays the same.',
      ],
      { label: 'Choose a new password', url },
    ),

  passwordChanged: (appName: string, to: string) =>
    build(
      'password-changed',
      to,
      appName,
      `Your ${appName} password was changed`,
      'Your password was changed',
      [
        'This is a confirmation that your password was just changed. You were signed out on other devices.',
        'If you did not do this, reset your password now and contact your program coordinator.',
      ],
    ),

  adminInvite: (appName: string, to: string, inviterName: string, url: string) =>
    build(
      'admin-invite',
      to,
      appName,
      `You are invited to the ${appName} admin console`,
      'You have been invited as an admin',
      [
        `${inviterName} invited you to help manage ${appName}.`,
        'Set your name and password to activate your account. The invite works for 72 hours.',
      ],
      { label: 'Accept the invite', url },
    ),
};
