/**
 * ResendMailer — production implementation of `Mailer` using Resend
 * (https://resend.com). Calls Resend's REST API directly via fetch
 * rather than adding the `resend` npm package as a dependency — the
 * API is a single simple POST, so this keeps the footprint minimal
 * (same rationale as the rest of this project favoring small,
 * self-contained modules over new dependencies where reasonable).
 *
 * Selected automatically by src/lib/mailer/index.ts when
 * RESEND_API_KEY is set — see that file's swap-point logic. Requires:
 *   RESEND_API_KEY       - from the Resend dashboard
 *   RESEND_FROM_EMAIL    - a sender address on a domain verified with Resend
 */

import type { Mailer, MailMessage } from "./mailer.interface";

const RESEND_API_URL = "https://api.resend.com/emails";

export class ResendMailer implements Mailer {
  constructor(
    private readonly apiKey: string,
    private readonly fromEmail: string
  ) {}

  async send(message: MailMessage): Promise<void> {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      // Never throw the raw Resend error body to the caller (it can
      // include account-identifying details) — log server-side only,
      // and let AuthService's existing catch-and-log-non-fatal
      // handling in requestPasswordReset/sendVerificationEmail decide
      // what the user sees.
      console.error(`ResendMailer: send failed (${response.status})`, body);
      throw new Error("Failed to send email via Resend.");
    }
  }
}
