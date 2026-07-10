/**
 * Route/action guards. Every protected admin layout or server action
 * calls `requireAdminSession()` (or `requirePermission()`) rather than
 * reading the session cookie directly — this is the single choke point
 * that will later switch from `mock-session.ts` to real NextAuth
 * without touching any calling code.
 */

import { redirect } from "next/navigation";
import { getAdminSession, type AdminSession } from "./mock-session";
import { hasPermission } from "./permissions";

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

export async function requirePermission(permission: string): Promise<AdminSession> {
  const session = await requireAdminSession();
  if (!hasPermission(session.role, permission)) {
    redirect("/admin/dashboard?error=forbidden");
  }
  return session;
}
