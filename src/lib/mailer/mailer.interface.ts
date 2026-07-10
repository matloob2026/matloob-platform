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
 *   - production swaps in one file (see the TODO at the bottom of this
 *     file) without touching AuthService or any API route
 *   - tests can inject a fake Mailer and assert on `.sent` without
 *     hitting the network
 */

export interface MailMessage {
  to: string;
  subject: string;
  /** Plain-text body. Keep templates here simple; a proper HTML+text
   * templating layer is a NotificationService concern, not this file's. */
  text: string;
  html?: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/**
 * TODO (production swap point): implement e.g. `SesMailer` or
 * `ResendMailer` in this same folder, satisfying the `Mailer`
 * interface, and change the single export in `index.ts` to construct
 * that class instead of `ConsoleMailer` when
 * `process.env.NODE_ENV === "production"` (or a dedicated
 * `MAIL_PROVIDER` env var — see .env.example `EMAIL_PROVIDER_API_KEY`).
 * No other file in the codebase should need to change.
 */
