import { describe, it, expect } from "vitest";
import { verificationEmailTemplate, passwordResetEmailTemplate } from "@/lib/mailer/templates";

describe("email templates", () => {
  it("verification template includes the link in both text and html, and is Arabic", () => {
    const link = "https://example.com/verify-email?token=abc123";
    const { subject, text, html } = verificationEmailTemplate(link);

    expect(subject).toMatch(/[\u0600-\u06FF]/); // contains Arabic script
    expect(text).toContain(link);
    expect(html).toContain(link);
    expect(html).toContain('dir="rtl"');
  });

  it("password reset template includes the link in both text and html, and is Arabic", () => {
    const link = "https://example.com/reset-password?token=xyz789";
    const { subject, text, html } = passwordResetEmailTemplate(link);

    expect(subject).toMatch(/[\u0600-\u06FF]/);
    expect(text).toContain(link);
    expect(html).toContain(link);
    expect(html).toContain('dir="rtl"');
  });
});
