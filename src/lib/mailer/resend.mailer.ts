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
    console.log("[ResendMailer] ENTER send() ->", message.to);

    const payload = {
      from: this.fromEmail,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    };
    // Exact payload being sent to Resend (never logs the Authorization
    // header / API key).
    console.log("[ResendMailer] Request payload (excluding Authorization header):", JSON.stringify(payload));
    console.log("[ResendMailer] Request URL:", RESEND_API_URL);

    let response: Response;
    try {
      response = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      // The fetch() call itself failed (DNS, timeout, TLS, network
      // partition, etc.) — this never reached Resend at all.
      console.error(
        "[ResendMailer] fetch() threw before any response was received. Full exception:",
        networkErr instanceof Error
          ? { name: networkErr.name, message: networkErr.message, stack: networkErr.stack }
          : networkErr
      );
      throw new Error("Failed to send email via Resend.");
    }

    const rawBody = await response.text().catch(() => "");
    let parsedBody: unknown = rawBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      // not JSON — keep rawBody as-is
    }

    // HTTP status and complete response body returned by Resend,
    // logged regardless of success or failure.
    console.log("[ResendMailer] HTTP status returned by Resend:", response.status, response.statusText);
    console.log("[ResendMailer] Complete response body returned by Resend (raw):", rawBody);
    console.log("[ResendMailer] Complete response body returned by Resend (parsed):", parsedBody);

    if (!response.ok) {
      console.error("[ResendMailer] send failed — full diagnostic:", {
        requestUrl: RESEND_API_URL,
        selectedMailer: "ResendMailer",
        fromEmail: this.fromEmail,
        to: message.to,
        httpStatus: response.status,
        httpStatusText: response.statusText,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseBodyRaw: rawBody,
        responseBodyParsed: parsedBody,
        resendErrorMessage:
          typeof parsedBody === "object" && parsedBody !== null && "message" in parsedBody
            ? (parsedBody as { message?: unknown }).message
            : undefined,
      });

      // Never throw the raw Resend error body to the caller (it can
      // include account-identifying details) — log server-side only,
      // and let AuthService's existing catch-and-log-non-fatal
      // handling in requestPasswordReset/sendVerificationEmail decide
      // what the user sees. Business logic unchanged: same thrown
      // Error type/message as before — only the logging is new.
      throw new Error("Failed to send email via Resend.");
    }

    console.log("[ResendMailer] send() SUCCESS ->", message.to);
  }
}
