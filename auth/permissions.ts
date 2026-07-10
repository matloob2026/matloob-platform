/**
 * Role → permission matrix. See src/auth/README.md (Phase 1) for the
 * rationale: route handlers and layouts call `hasPermission(role, "...")`
 * rather than checking `role === "ADMIN"` inline, so adding a new role
 * (e.g. a scoped `FINANCE_ADMIN`) later touches this file only.
 *
 * Phase 2 status: this matrix is real and used by the mock session guard
 * (src/auth/guards.ts). It does not yet connect to a real database-backed
 * User.role — that lands with full auth integration.
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

export function hasPermission(role: AdminRole, permission: string): boolean {
  const granted = ADMIN_PERMISSIONS[role];
  return granted.includes("*") || granted.includes(permission);
}
