/**
 * End-to-end auth flow tests — register, login, email verification,
 * password reset — run against a REAL Postgres database via Prisma.
 *
 * WHY THIS FILE EXISTS NOW, BUT CAN'T RUN YET IN THIS SANDBOX:
 * these tests need `@prisma/client` to be actually generated
 * (`prisma generate`) and the schema migrated onto a reachable
 * Postgres (`prisma migrate deploy`). Both require downloading the
 * Prisma engine binary from binaries.prisma.sh, which this sandbox's
 * network proxy blocks. The test suite is written and ready — it is
 * intentionally NOT run here. Once `DATABASE_URL` points at a real,
 * migrated database (locally or on Vercel), run:
 *
 *   npx prisma generate
 *   npx prisma migrate deploy
 *   npm run test:integration
 *
 * and this file exercises the full lifecycle end to end.
 *
 * Uses a FakeMailer (not ConsoleMailer) so tests can read the raw
 * verification/reset token straight out of the "sent" message body,
 * instead of parsing console output.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { AuthService as AuthServiceType, AuthError } from "@/services/auth.service";
import type { Mailer, MailMessage } from "@/lib/mailer";

class FakeMailer implements Mailer {
  public sent: MailMessage[] = [];
  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }
  latest(): MailMessage {
    const msg = this.sent[this.sent.length - 1];
    if (!msg) throw new Error("FakeMailer: no message was sent");
    return msg;
  }
  /** Pulls the raw token out of a `?token=...` link in the message body. */
  latestToken(): string {
    const match = this.latest().text.match(/token=([^\s&]+)/);
    const token = match?.[1];
    if (!token) throw new Error("FakeMailer: no token found in latest message");
    return token;
  }
}

const hasDatabase = Boolean(process.env.DATABASE_URL);

// Skips cleanly (rather than failing) when there's no real database to
// talk to — e.g. in this sandbox. Runs for real in any environment
// where DATABASE_URL is set and migrated.
//
// `@prisma/client` and `AuthService` are imported dynamically inside
// beforeAll (not statically at the top of this file) specifically so
// that collecting this test file never touches the un-generated Prisma
// client stub when DATABASE_URL isn't set — only actually running the
// suite does.
describe.skipIf(!hasDatabase)("AuthService — live database end-to-end", () => {
  let prisma: PrismaClient;
  let authService: AuthServiceType;
  const fakeMailer = new FakeMailer();

  // A unique email per test run so re-running against a persistent DB
  // never collides with a previous run's leftover row.
  const testEmail = `phase3-e2e-${Date.now()}@matloob.test`;
  const initialPassword = "InitialPass123!";
  const newPassword = "RotatedPass456!";

  beforeAll(async () => {
    const { PrismaClient } = await import("@prisma/client");
    const { AuthService } = await import("@/services/auth.service");
    prisma = new PrismaClient();
    authService = new AuthService(fakeMailer);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });

  it("registers a new user in PENDING_VERIFICATION status", async () => {
    const result = await authService.register({
      email: testEmail,
      password: initialPassword,
      displayName: "Phase 3 E2E Test",
    });

    expect(result.email).toBe(testEmail);
    expect(result.role).toBe("BUYER");

    const dbUser = await prisma.user.findUniqueOrThrow({ where: { email: testEmail } });
    expect(dbUser.status).toBe("PENDING_VERIFICATION");
    expect(dbUser.emailVerifiedAt).toBeNull();

    const tokenRow = await prisma.emailVerificationToken.findFirst({ where: { userId: dbUser.id } });
    expect(tokenRow).not.toBeNull();
  });

  it("rejects duplicate registration for the same email", async () => {
    await expect(
      authService.register({ email: testEmail, password: initialPassword, displayName: "Dup" })
    ).rejects.toMatchObject({ code: "EMAIL_IN_USE" } satisfies Partial<AuthError>);
  });

  it("refuses login before the account is verified", async () => {
    await expect(authService.login(testEmail, initialPassword)).rejects.toMatchObject({
      code: "ACCOUNT_NOT_VERIFIED",
    } satisfies Partial<AuthError>);
  });

  it("rejects an invalid or made-up verification token", async () => {
    await expect(authService.verifyEmail("not-a-real-token")).rejects.toMatchObject({
      code: "INVALID_OR_EXPIRED_TOKEN",
    } satisfies Partial<AuthError>);
  });

  it("verifies the email using the token from the sent mail, activating the account", async () => {
    const rawToken = fakeMailer.latestToken();
    await authService.verifyEmail(rawToken);

    const dbUser = await prisma.user.findUniqueOrThrow({ where: { email: testEmail } });
    expect(dbUser.status).toBe("ACTIVE");
    expect(dbUser.emailVerifiedAt).not.toBeNull();
  });

  it("rejects re-using an already-consumed verification token", async () => {
    const consumedToken = fakeMailer.latestToken();
    await expect(authService.verifyEmail(consumedToken)).rejects.toMatchObject({
      code: "INVALID_OR_EXPIRED_TOKEN",
    } satisfies Partial<AuthError>);
  });

  it("logs in successfully once verified, with correct credentials", async () => {
    const user = await authService.login(testEmail, initialPassword);
    expect(user.email).toBe(testEmail);
    expect(user.displayName).toBe("Phase 3 E2E Test");
  });

  it("rejects login with an incorrect password", async () => {
    await expect(authService.login(testEmail, "totally-wrong-password")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    } satisfies Partial<AuthError>);
  });

  it("does not error for a forgot-password request on an unknown email (anti-enumeration)", async () => {
    await expect(authService.requestPasswordReset("no-such-user@matloob.test")).resolves.toBeUndefined();
  });

  it("sends a password reset email and resets the password with the token", async () => {
    await authService.requestPasswordReset(testEmail);
    const rawToken = fakeMailer.latestToken();

    await authService.resetPassword(rawToken, newPassword);

    // Old password must no longer work...
    await expect(authService.login(testEmail, initialPassword)).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    } satisfies Partial<AuthError>);

    // ...and the new one must.
    const user = await authService.login(testEmail, newPassword);
    expect(user.email).toBe(testEmail);
  });

  it("revokes existing sessions when a password is reset", async () => {
    const dbUser = await prisma.user.findUniqueOrThrow({ where: { email: testEmail } });
    // Simulate a standing session that existed before the reset above.
    await prisma.session.create({
      data: {
        userId: dbUser.id,
        tokenHash: "test-session-hash-should-be-deleted",
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });

    await authService.requestPasswordReset(testEmail);
    const rawToken = fakeMailer.latestToken();
    await authService.resetPassword(rawToken, "AnotherRotation789!");

    const remainingSessions = await prisma.session.findMany({ where: { userId: dbUser.id } });
    expect(remainingSessions).toHaveLength(0);
  });

  it("rejects a password reset with an expired/invalid token", async () => {
    await expect(authService.resetPassword("bogus-reset-token", "SomeNewPass999!")).rejects.toMatchObject({
      code: "INVALID_OR_EXPIRED_TOKEN",
    } satisfies Partial<AuthError>);
  });
});

describe.skipIf(hasDatabase)("AuthService — live database end-to-end (skipped)", () => {
  it("is skipped because DATABASE_URL is not set — see file header for the commands to enable it", () => {
    expect(hasDatabase).toBe(false);
  });
});
