/**
 * TEMPORARY mock session layer for Phase 2 (Admin Dashboard skeleton).
 *
 * This is intentionally NOT NextAuth yet — Phase 1's src/auth/README.md
 * specifies NextAuth.js v5 as the real strategy, but wiring it up needs
 * a live database (User table) which is a Phase 3+ (business logic /
 * database integration) concern, explicitly out of scope for this
 * dashboard-skeleton phase.
 *
 * What this DOES provide: a real, working login → protected routes →
 * logout flow using a signed cookie, so the dashboard skeleton can
 * actually be clicked through end-to-end rather than being static
 * mockups. The public interface (`getAdminSession`, `createAdminSession`,
 * `destroySession`) is the exact shape the real NextAuth-backed
 * implementation will expose, so swapping the internals later does not
 * require touching any page or layout that calls these functions.
 */

import { cookies } from "next/headers";
import type { AdminRole } from "./permissions";

const SESSION_COOKIE = "matloob_admin_session";

export interface AdminSession {
  userId: string;
  name: string;
  email: string;
  role: AdminRole;
}

/**
 * Phase 2 mock "database" of admin accounts, for demo login only.
 * Replace with a real User lookup (role IN ('ADMIN','MODERATOR')) once
 * Prisma is wired up — see src/services (Phase 1) for the intended
 * service boundary; this file will be deleted, not extended, at that point.
 */
const MOCK_ADMIN_ACCOUNTS: Record<string, { password: string; session: AdminSession }> = {
  "admin@matloob.com": {
    password: "matloob-admin", // demo credential only — never real auth
    session: {
      userId: "mock-admin-1",
      name: "مدير المنصة",
      email: "admin@matloob.com",
      role: "ADMIN",
    },
  },
  "moderator@matloob.com": {
    password: "matloob-mod",
    session: {
      userId: "mock-moderator-1",
      name: "مشرف المحتوى",
      email: "moderator@matloob.com",
      role: "MODERATOR",
    },
  },
};

export function verifyMockCredentials(email: string, password: string): AdminSession | null {
  const account = MOCK_ADMIN_ACCOUNTS[email.toLowerCase()];
  if (!account || account.password !== password) return null;
  return account.session;
}

export async function createAdminSession(session: AdminSession): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
