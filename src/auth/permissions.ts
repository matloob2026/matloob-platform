/**
 * Role → permission matrix. See src/auth/README.md (Phase 1) for the
 * rationale: route handlers and layouts call `hasPermission(role, "...")`
 * rather than checking `role === "ADMIN"` inline, so adding a new role
 * (e.g. a scoped `FINANCE_ADMIN`) later touches this file only.
 *
 * Phase 2 status: this matrix is real and used by the mock session guard
 * (src/auth/guards.ts). It does not yet connect to a real database-backed
 * User.role — that lands with full auth integration.
 *
 * CMS FOUNDATION (Checkpoint 01): all content-management permissions
 * (`categories:manage`, `currencies:view`, `pages:view`, `blog:view`, ...)
 * are intentionally granted to ADMIN only (via the "*" wildcard) and are
 * NOT added to MODERATOR's grant list below — CMS management stays an
 * Admin-only area, per this checkpoint's requirements. `categories:view`
 * was already ADMIN-only before this checkpoint; that is unchanged.
 */

export type AdminRole = "ADMIN" | "MODERATOR";

export const ADMIN_PERMISSIONS: Record<AdminRole, readonly string[]> = {
  ADMIN: ["*"],
  MODERATOR: [
    "dashboard:view",
    "requests:view",
    "requests:moderate",
    "offers:view",
    "users:view",
    "media:view",
  ],
};

/**
 * Categories management requires `categories:manage` for write actions
 * (create/update/toggle/delete) — `categories:view` alone (already used
 * to gate the sidebar link and read-only access) is not sufficient. Only
 * ADMIN holds `categories:manage`, via the "*" wildcard above.
 */
export const CATEGORY_MANAGE_PERMISSION = "categories:manage";

export function hasPermission(role: AdminRole, permission: string): boolean {
  const granted = ADMIN_PERMISSIONS[role];
  return granted.includes("*") || granted.includes(permission);
}
