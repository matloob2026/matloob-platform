/**
 * AuthService
 * ===========
 * Owns every write/read that touches credentials: registration, email
 * verification, credential login, and the password-reset flow. This is
 * the ONLY place in the codebase that reads/writes `passwordHash`,
 * `EmailVerificationToken`, or `PasswordResetToken` rows directly.
 *
 * Route handlers (src/app/api/auth/**) and the NextAuth Credentials
 * provider (src/auth/auth.config.ts) both call into this service rather
 * than touching Prisma themselves — same service-boundary rule as
 * RequestService / HomepageContentService.
 *
 * IMPLEMENTATION STATUS: Phase 3 — Part 1 (auth foundation). Real
 * Prisma-backed implementation, not a stub. NextAuth wiring
 * (src/auth/auth.config.ts) and the API routes that expose this over
 * HTTP are part of this same phase — see those files for the last mile.
 *
 * NOTE ON VERIFICATION: `npx prisma generate` cannot complete in the
 * sandbox this was developed in, because its network proxy blocks
 * binaries.prisma.sh (the engine download host). The code has NOT been
 * rewritten to work around that — it is written directly against the
 * real Prisma schema and is expected to run as-is once `prisma
 * generate` + `prisma migrate deploy` succeed with real network
 * access. tests/integration/auth-flow.e2e.test.ts exercises all four
 * flows (register, login, verify email, reset password) against a
 * live Postgres database and is ready to run the moment that's
 * available — see DEPLOYMENT.md for the exact remaining commands.
 */

import { prisma } from "@/lib/prisma";
import { mailer } from "@/lib/mailer";
import type { Mailer } from "@/lib/mailer";
import { verificationEmailTemplate, passwordResetEmailTemplate } from "@/lib/mailer/templates";
import { hashPassword, verifyPassword, needsRehash, MIN_PASSWORD_LENGTH } from "@/auth/password";
import {
  generateEmailVerificationToken,
  generatePasswordResetToken,
  hashIncomingToken,
  isTokenExpired,
} from "@/auth/tokens";
import type { UserRole } from "@/types/domain";

// ---------------------------------------------------------------------
// Errors — typed so API routes can map each one to the right HTTP status
// without string-matching error messages.
// ---------------------------------------------------------------------

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "EMAIL_IN_USE"
      | "WEAK_PASSWORD"
      | "INVALID_CREDENTIALS"
      | "ACCOUNT_NOT_VERIFIED"
      | "ACCOUNT_SUSPENDED"
      | "INVALID_OR_EXPIRED_TOKEN"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// ---------------------------------------------------------------------
// Input / output contracts
// ---------------------------------------------------------------------

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  role?: Extract<UserRole, "BUYER" | "SUPPLIER" | "BOTH">; // never let a client self-assign ADMIN/MODERATOR
}

export interface RegisteredUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
}

function verificationLink(rawToken: string): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base}/verify-email?token=${rawToken}`;
}

function passwordResetLink(rawToken: string): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base}/reset-password?token=${rawToken}`;
}

export class AuthService {
  // Defaults to the real ConsoleMailer/production Mailer singleton — see
  // src/lib/mailer/index.ts. Tests (tests/integration/auth-flow.e2e.test.ts)
  // inject a FakeMailer here to capture verification/reset links without
  // needing a real mail provider or parsing console output.
  constructor(private readonly mailerImpl: Mailer = mailer) {}

  /**
   * Create a new BUYER/SUPPLIER/BOTH account and send a verification
   * email. Never assigns ADMIN/MODERATOR — those roles are only ever
   * granted by an existing admin via the Admin Dashboard (Phase 2),
   * never through self-registration.
   */
  async register(input: RegisterInput): Promise<RegisteredUser> {
    const email = input.email.trim().toLowerCase();

    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new AuthError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
        "WEAK_PASSWORD"
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AuthError("An account with this email already exists.", "EMAIL_IN_USE");
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: input.role ?? "BUYER",
        status: "PENDING_VERIFICATION",
        profile: {
          create: {
            displayName: input.displayName,
          },
        },
      },
    });

    await this.sendVerificationEmail(user.id, email);

    return { id: user.id, email, role: user.role };
  }

  /**
   * Issue a fresh verification token and email it. Safe to call again
   * if a user's first email never arrived — always invalidates prior
   * unconsumed tokens for that user first, so only the newest link
   * works (prevents an old, possibly-leaked link from staying valid).
   */
  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    await prisma.emailVerificationToken.deleteMany({
      where: { userId, consumedAt: null },
    });

    const token = generateEmailVerificationToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId,
        email,
        tokenHash: token.hash,
        expiresAt: token.expiresAt,
      },
    });

    await this.mailerImpl.send({
      to: email,
      ...verificationEmailTemplate(verificationLink(token.raw)),
    });
  }

  /** Consume a raw verification token from the emailed link. */
  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = hashIncomingToken(rawToken);
    const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

    if (!record || record.consumedAt || isTokenExpired(record.expiresAt)) {
      throw new AuthError("This verification link is invalid or has expired.", "INVALID_OR_EXPIRED_TOKEN");
    }

    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date(), status: "ACTIVE" },
      }),
    ]);
  }

  /**
   * Verify credentials for the NextAuth Credentials provider. Does NOT
   * create a session itself — NextAuth (src/auth/auth.config.ts) owns
   * session/JWT issuance; this just answers "are these correct, and is
   * this account allowed to sign in right now".
   */
  async login(email: string, password: string): Promise<AuthenticatedUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    });

    // Deliberately identical error for "no such user" and "wrong
    // password" — do not leak which one it was (user enumeration).
    if (!user || !user.passwordHash) {
      throw new AuthError("Incorrect email or password.", "INVALID_CREDENTIALS");
    }

    const valid = await verifyPassword(user.passwordHash, password);
    if (!valid) {
      throw new AuthError("Incorrect email or password.", "INVALID_CREDENTIALS");
    }

    if (user.status === "SUSPENDED" || user.status === "BANNED") {
      throw new AuthError("This account is not able to sign in.", "ACCOUNT_SUSPENDED");
    }
    if (user.status === "PENDING_VERIFICATION") {
      throw new AuthError("Please verify your email before signing in.", "ACCOUNT_NOT_VERIFIED");
    }

    // Opportunistic rehash if argon2 cost parameters were tuned since
    // this hash was created — never blocks login on failure.
    if (needsRehash(user.passwordHash)) {
      try {
        const freshHash = await hashPassword(password);
        await prisma.user.update({ where: { id: user.id }, data: { passwordHash: freshHash } });
      } catch {
        // Non-fatal — worst case we rehash next login instead.
      }
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return {
      id: user.id,
      email: normalizedEmail,
      role: user.role,
      displayName: user.profile?.displayName ?? normalizedEmail,
    };
  }

  /**
   * Read-only lookup used by the `jwt` callback after `signIn` has
   * already resolved/linked the account — avoids re-running
   * loginWithGoogle's writes a second time per sign-in.
   */
  async getAuthenticatedUserByEmail(email: string): Promise<AuthenticatedUser | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: normalizedEmail,
      role: user.role,
      displayName: user.profile?.displayName ?? normalizedEmail,
    };
  }

  /**
   * Resolve (or create) the internal User for a Google sign-in, called
   * from the NextAuth `signIn`/`jwt` callbacks in auth.config.ts — this
   * is the OAuth equivalent of `login()` above: same account-status
   * checks, same return shape, but no password involved since Google
   * already verified the account owns this email address.
   *
   * - Existing user with this email: link the OAuthAccount (idempotent
   *   — safe to call on every sign-in) and, if they'd registered by
   *   email but never verified it, mark them verified/ACTIVE now
   *   (Google's own verification satisfies ours).
   * - No existing user: create one, already ACTIVE/verified, plus a
   *   UserProfile from the Google profile's display name.
   *
   * Uses `OAuthAccount`, already in prisma/schema.prisma — no schema
   * change needed for this.
   */
  async loginWithGoogle(params: {
    email: string;
    providerAccountId: string;
    displayName?: string;
  }): Promise<AuthenticatedUser> {
    const normalizedEmail = params.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    });

    if (existing) {
      if (existing.status === "SUSPENDED" || existing.status === "BANNED") {
        throw new AuthError("This account is not able to sign in.", "ACCOUNT_SUSPENDED");
      }

      await prisma.oAuthAccount.upsert({
        where: {
          provider_providerAccountId: { provider: "google", providerAccountId: params.providerAccountId },
        },
        create: {
          userId: existing.id,
          provider: "google",
          providerAccountId: params.providerAccountId,
        },
        update: {},
      });

      if (existing.status === "PENDING_VERIFICATION") {
        await prisma.user.update({
          where: { id: existing.id },
          data: { status: "ACTIVE", emailVerifiedAt: new Date() },
        });
      }

      await prisma.user.update({ where: { id: existing.id }, data: { lastLoginAt: new Date() } });

      return {
        id: existing.id,
        email: normalizedEmail,
        role: existing.role,
        displayName: existing.profile?.displayName ?? params.displayName ?? normalizedEmail,
      };
    }

    const created = await prisma.user.create({
      data: {
        email: normalizedEmail,
        role: "BUYER",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
        profile: {
          create: { displayName: params.displayName?.trim() || normalizedEmail },
        },
        accounts: {
          create: { provider: "google", providerAccountId: params.providerAccountId },
        },
      },
      include: { profile: true },
    });

    return {
      id: created.id,
      email: normalizedEmail,
      role: created.role,
      displayName: created.profile?.displayName ?? normalizedEmail,
    };
  }

  /**
   * Resend the verification email for an account that registered but
   * never completed (or lost) the original link. Always resolves
   * successfully regardless of whether the email exists or is already
   * verified — same anti-enumeration posture as requestPasswordReset
   * below. Reuses sendVerificationEmail, which already invalidates any
   * prior unconsumed token before issuing a new one.
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || user.status !== "PENDING_VERIFICATION") return; // silently no-op

    await this.sendVerificationEmail(user.id, normalizedEmail);
  }

  /**
   * Always resolves successfully whether or not the email exists, so
   * callers (the API route) can return an identical response either
   * way — this is the standard mitigation for account enumeration via
   * the "forgot password" form.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return; // silently no-op — see docstring above

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, consumedAt: null } });

    const token = generatePasswordResetToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: token.hash, expiresAt: token.expiresAt },
    });

    await this.mailerImpl.send({
      to: normalizedEmail,
      ...passwordResetEmailTemplate(passwordResetLink(token.raw)),
    });
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new AuthError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
        "WEAK_PASSWORD"
      );
    }

    const tokenHash = hashIncomingToken(rawToken);
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.consumedAt || isTokenExpired(record.expiresAt)) {
      throw new AuthError("This reset link is invalid or has expired.", "INVALID_OR_EXPIRED_TOKEN");
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
      // A password reset is also treated as an implicit "log out
      // everywhere" — revoke all standing sessions for this user.
      prisma.session.deleteMany({ where: { userId: record.userId } }),
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
    ]);
  }
}

export const authService = new AuthService();
