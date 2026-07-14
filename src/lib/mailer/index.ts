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

  // TEMPORARY DIAGNOSTIC LOG — requested to identify, at runtime,
  // exactly which mailer gets instantiated and why. No business logic
  // below is changed; this only prints information.
  console.log("[mailer-diagnostic] RESEND_API_KEY exists:", Boolean(apiKey));
  console.log("[mailer-diagnostic] RESEND_FROM_EMAIL exists:", Boolean(fromEmail));
  console.log("[mailer-diagnostic] process.env.RESEND_FROM_EMAIL exact value:", JSON.stringify(fromEmail));

  if (apiKey && fromEmail) {
    console.log("[mailer-diagnostic] Selected: ResendMailer");
    return new ResendMailer(apiKey, fromEmail);
  }

  console.log(
    "[mailer-diagnostic] Selected: ConsoleMailer —",
    !apiKey && !fromEmail
      ? "both RESEND_API_KEY and RESEND_FROM_EMAIL are falsy"
      : !apiKey
        ? "RESEND_API_KEY is falsy"
        : "RESEND_FROM_EMAIL is falsy"
  );

  // Kept permanently: this fallback is intentional for local dev/CI
  // (no external credentials needed), but landing here in production
  // is a real misconfiguration — previously this was completely
  // silent, which is exactly how a missing RESEND_FROM_EMAIL caused
  // registration to "succeed" while Resend's dashboard stayed at zero
  // sends (ConsoleMailer always resolves; the real API was never
  // called, and nothing said so). Now it's always logged, naming
  // whichever variable is missing.
  console.error(
    "[mailer] Falling back to ConsoleMailer — emails will NOT be sent for real.",
    !apiKey && !fromEmail
      ? "Both RESEND_API_KEY and RESEND_FROM_EMAIL are missing."
      : !apiKey
        ? "RESEND_API_KEY is missing."
        : "RESEND_FROM_EMAIL is missing."
  );
  return new ConsoleMailer();
}

export const mailer: Mailer = createMailer();
