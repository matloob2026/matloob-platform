/**
 * ConsoleMailer — dev/CI implementation of `Mailer`.
 *
 * Logs the message instead of sending it, so `npm run dev` and tests
 * never need real email provider credentials. This is intentionally
 * the ONLY implementation until a production provider is wired in (see
 * the TODO in mailer.interface.ts) — do not extend this class with
 * "real" sending logic; add a sibling class instead so local dev never
 * accidentally sends real email.
 */

import type { Mailer, MailMessage } from "./mailer.interface";

export class ConsoleMailer implements Mailer {
  async send(message: MailMessage): Promise<void> {
    console.log(
      [
        "── ConsoleMailer: outgoing mail (dev-only, not actually sent) ──",
        `To:      ${message.to}`,
        `Subject: ${message.subject}`,
        "Body:",
        message.text,
        "─────────────────────────────────────────────────────────────",
      ].join("\n")
    );
  }
}
