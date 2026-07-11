/**
 * Single import point for the rest of the app: `import { mailer } from
 * "@/lib/mailer"`. See mailer.interface.ts for the swap-point contract.
 *
 * Provider selection: ResendMailer when RESEND_API_KEY (+
 * RESEND_FROM_EMAIL) are set, otherwise ConsoleMailer (dev/CI, logs
 * instead of sending — no external credentials needed). This is the
 * one-line swap the original TODO in mailer.interface.ts pointed at.
 */

import { ConsoleMailer } from "./console.mailer";
import { ResendMailer } from "./resend.mailer";
import type { Mailer } from "./mailer.interface";

export type { Mailer, MailMessage } from "./mailer.interface";

function createMailer(): Mailer {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (apiKey && fromEmail) {
    return new ResendMailer(apiKey, fromEmail);
  }

  return new ConsoleMailer();
}

export const mailer: Mailer = createMailer();
