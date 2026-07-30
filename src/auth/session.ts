/**
 * Real, database-backed admin session — replaces the Phase 2
 * `mock-session.ts` (deleted; its own docstring said it would be,
 * "not extended," once real DB-backed auth landed).
 *
 * Reuses everything that already exists rather than building a
 * parallel system:
 *   - the existing `User` model — an "admin account" is simply a
 *     `User` row with `role` ADMIN or MODERATOR (already in the
 *     `UserRole` enum, already used by the real end-user auth flow in
 *     src/services/auth.service.ts),
 *   - the existing `Session` model — a real, revocable row per login,
 *     not just a signed cookie holding the session data directly. The
 *     cookie only ever carries the RAW lookup token; the session's
 *     actual data (userId/role/etc.) is always read fresh from the DB
 *     on every request. This is what makes "lock/unlock account" and
 *     "session management" (revoke a specific session, or every
 *     session) actually work: suspending a `User` or deleting their
 *     `Session` row invalidates their active login immediately, on
 *     the very next request — there is no separate cache to fall out
 *     of sync,
 *   - the existing `@/auth/password` module (`verifyPassword`,
 *     `hashPassword`, `needsRehash`) — the exact same password
 *     verification `AuthService.login()` already uses for end users,
 *   - the existing `@/auth/tokens` token-hashing pattern
 *     (`generateAdminSessionToken`/`hashIncomingToken`) — the same
 *     "raw token in the cookie, SHA-256 hash in the database" design
 *     already used for email verification and password reset links,
 *     extended with one more thin named wrapper (matching how those
 *     two are each their own wrapper around the same shared
 *     generator) rather than a new hashing scheme.
 *
 * The public interface below (`AdminSession`, `getAdminSession`,
 * `createAdminSession`, `destroyAdminSession`) is the EXACT same shape
 * `mock-session.ts` exposed, so `src/auth/guards.ts` and every
 * existing `requirePermission(...)` call across every admin CMS
 * screen keep working completely unchanged.
 */

import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "./password";
import { generateAdminSessionToken, hashIncomingToken, isTokenExpired } from "./tokens";
import { siteSettingsAdminService } from "@/services/admin/site-settings.service";
import type { AdminRole } from "./permissions";

const SESSION_COOKIE = "matloob_admin_session";
const ADMIN_ROLES: readonly AdminRole[] = ["ADMIN", "MODERATOR"];

export interface AdminSession {
  userId: string;
  name: string;
  email: string;
  role: AdminRole;
  /** Assigned custom `AdminRole` (Administration module's Roles
   * management) — only ever meaningful for a MODERATOR account; an
   * ADMIN's access is always the full wildcard regardless. `null` when
   * no custom role is assigned, which is the safe default (no change
   * from MODERATOR's existing hardcoded baseline permissions). */
  customRoleId: string | null;
  /** The `Session` row's own id — used by the Admin session-management
   * screen to let an admin revoke a specific login (their own, or,
   * with permission, another admin's) without needing the raw token,
   * which is never persisted. */
  sessionId: string;
}

export class AdminAuthError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_CREDENTIALS" | "ACCOUNT_LOCKED" | "NOT_ADMIN"
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}

function isAdminRole(role: string): role is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

/**
 * Verifies email/password against the real `User` table and returns
 * the account's basic identity — does NOT create a session itself
 * (see `createAdminSession`), matching `AuthService.login()`'s own
 * separation of "verify" from "establish session" one layer up.
 *
 * Deliberately identical error for "no such user"/"wrong password"/
 * "not an admin account" (`INVALID_CREDENTIALS`) — same
 * user-enumeration protection `AuthService.login()` already applies.
 */
export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<{ userId: string; name: string; email: string; role: AdminRole; customRoleId: string | null }> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { profile: { select: { displayName: true } } },
  });

  if (!user || !user.passwordHash || !isAdminRole(user.role)) {
    throw new AdminAuthError("بيانات الدخول غير صحيحة.", "INVALID_CREDENTIALS");
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    throw new AdminAuthError("بيانات الدخول غير صحيحة.", "INVALID_CREDENTIALS");
  }

  if (user.status === "SUSPENDED" || user.status === "BANNED") {
    throw new AdminAuthError("هذا الحساب موقوف. تواصل مع مدير النظام.", "ACCOUNT_LOCKED");
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return {
    userId: user.id,
    name: user.profile?.displayName ?? normalizedEmail,
    email: normalizedEmail,
    role: user.role,
    customRoleId: user.customRoleId,
  };
}

/** Creates a real `Session` row (revocable — see this file's
 * docstring) and sets the httpOnly cookie to the RAW lookup token
 * only; the hash is what's stored in the database. */
export async function createAdminSession(identity: {
  userId: string;
  name: string;
  email: string;
  role: AdminRole;
}): Promise<void> {
  // Administration module: session length is admin-configurable (see
  // SecuritySettings.sessionTimeoutHours) — reuses the existing
  // SiteSettingsAdminService rather than a second settings reader.
  // Falls back to generateAdminSessionToken's own 8h default if this
  // read fails for any reason (never blocks login on a settings-fetch
  // error).
  let sessionTimeoutHours: number | undefined;
  try {
    const settings = await siteSettingsAdminService.getAllSettings();
    sessionTimeoutHours = settings.security.sessionTimeoutHours;
  } catch {
    sessionTimeoutHours = undefined;
  }

  const { raw, hash, expiresAt } = generateAdminSessionToken(sessionTimeoutHours);
  const headerList = await headers();

  const session = await prisma.session.create({
    data: {
      userId: identity.userId,
      tokenHash: hash,
      userAgent: headerList.get("user-agent") ?? null,
      ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      expiresAt,
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  void session; // only the cookie is needed by the caller; the row is the persisted source of truth
}

/**
 * Reads the cookie's raw token, hashes it, and looks up the matching
 * `Session` row — returning `null` (not throwing) for any of: no
 * cookie, expired/deleted session row, or a user that's since been
 * suspended/banned/demoted out of ADMIN/MODERATOR. This is what makes
 * "lock/unlock" and "revoke session" take effect immediately: there is
 * nothing cached anywhere else that needs separate invalidation.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const tokenHash = hashIncomingToken(raw);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: { include: { profile: { select: { displayName: true } } } } },
  });

  if (!session) return null;
  if (isTokenExpired(session.expiresAt)) {
    // Best-effort cleanup of an expired row — never blocks the "not
    // logged in" response on failure.
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  const user = session.user;
  if (!isAdminRole(user.role)) return null;
  if (user.status === "SUSPENDED" || user.status === "BANNED") return null;

  return {
    userId: user.id,
    name: user.profile?.displayName ?? user.email ?? "",
    email: user.email ?? "",
    role: user.role,
    customRoleId: user.customRoleId,
    sessionId: session.id,
  };
}

/** Real logout: deletes the `Session` row (not just the cookie), so a
 * stolen cookie can't be replayed after the user logs out. */
export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw) {
    const tokenHash = hashIncomingToken(raw);
    await prisma.session.deleteMany({ where: { tokenHash } });
  }
  store.delete(SESSION_COOKIE);
}

/** Revokes a specific session by its `Session.id` — used by the Admin
 * session-management screen (an admin ending their own other logged-in
 * sessions, or, with permission, another admin's). Does not require
 * the raw token (which is never persisted) — the row's id is enough. */
export async function revokeAdminSessionById(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => undefined);
}

/** All active (non-expired) sessions for a given admin user — for the
 * Admin session-management screen. */
export async function listAdminSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}
