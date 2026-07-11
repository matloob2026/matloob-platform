/**
 * Mailer contract.
 *
 * AuthService (and, later, NotificationService for other transactional
 * mail) depends only on this interface, never on a concrete provider.
 * This is the same "one boundary, swap the internals" pattern already
 * used for HomepageContentService and the admin session guards.
 *
 * WHY: email delivery is an infrastructure concern (SES, Postmark,
 * Resend, SendGrid...) that has nothing to do with auth business logic
 * (token generation, expiry, rate limiting). Keeping AuthService's
 * dependency at the interface level means:
 *   - local dev / CI can run with zero external credentials
 *     (ConsoleMailer, see console.mailer.ts)
 *   - production uses ResendMailer (see resend.mailer.ts) when
 *     RESEND_API_KEY/RESEND_FROM_EMAIL are set — selected in index.ts,
 *     without touching AuthService or any API route
 *   - tests can inject a fake Mailer and assert on `.sent` without
 *     hitting the network
 */

export interface MailMessage {
  to: string;
  subject: string;
  /** Plain-text fallback body — always sent alongside `html` below (see
   * src/lib/mailer/templates.ts for the shared Arabic templates). */
  text: string;
  html?: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/**
 * Production swap point: ResendMailer (resend.mailer.ts) is selected
 * automatically by index.ts when RESEND_API_KEY + RESEND_FROM_EMAIL are
 * set. Adding a different provider later (SES, Postmark, ...) is the
 * same pattern: implement `Mailer` in a new file in this folder, and
 * extend the selection logic in index.ts — no other file needs to
 * change.
 */
