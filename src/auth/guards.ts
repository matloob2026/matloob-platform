/**
 * Route/action guards. Every protected admin layout or server action
 * calls `requireAdminSession()` (or `requirePermission()`) rather than
 * reading the session cookie directly — this is the single choke point
 * that lets the session backing switch (Phase 2's mock cookie → the
 * real, database-backed `Session`-row implementation in
 * ./session.ts, completed for the Administration module) without
 * touching any calling code.
 *
 * Administration module: `requirePermission` now also checks a
 * MODERATOR's assigned custom `AdminRole` (see prisma/schema.prisma's
 * `AdminRole`/`AdminRolePermission` and src/auth/permissions.ts's
 * `PERMISSION_CATALOG`) in ADDITION to the hardcoded
 * `ADMIN_PERMISSIONS` baseline — never instead of it. An ADMIN's
 * wildcard access and a MODERATOR's existing baseline permissions are
 * completely unaffected whether or not any custom role exists; a
 * custom role can only ever ADD permissions beyond that baseline for
 * the specific MODERATOR account it's assigned to.
 */

import { redirect } from "next/navigation";
import { getAdminSession, type AdminSession } from "./session";
import { hasPermission } from "./permissions";
import { prisma } from "@/lib/prisma";

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

/** Checks a MODERATOR's assigned custom role for one additional
 * permission — never called for ADMIN (whose wildcard already covers
 * everything) since `requirePermission` below only reaches this after
 * the baseline `hasPermission` check has already failed. */
async function hasCustomRolePermission(customRoleId: string, permission: string): Promise<boolean> {
  const grant = await prisma.adminRolePermission.findUnique({
    where: { roleId_permission: { roleId: customRoleId, permission } },
    select: { id: true },
  });
  return Boolean(grant);
}

export async function requirePermission(permission: string): Promise<AdminSession> {
  const session = await requireAdminSession();

  if (hasPermission(session.role, permission)) {
    return session;
  }

  if (session.customRoleId && (await hasCustomRolePermission(session.customRoleId, permission))) {
    return session;
  }

  redirect("/admin/dashboard?error=forbidden");
}
