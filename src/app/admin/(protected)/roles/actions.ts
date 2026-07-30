"use server";

/**
 * Server actions backing the Roles management screen
 * (src/app/admin/(protected)/roles/page.tsx + RolesManager.tsx). Same
 * thin-wrapper shape as every other CMS actions.ts in this codebase.
 *
 * Everything here requires `ROLE_MANAGE_PERMISSION` (ADMIN only, via
 * the wildcard) — Roles management is deliberately never delegable to
 * a MODERATOR, even via a custom role (see
 * src/auth/permissions.ts's `PERMISSION_CATALOG` docstring on why
 * `roles:manage` is excluded from that catalog).
 */

import { requirePermission } from "@/auth/guards";
import { ROLE_MANAGE_PERMISSION } from "@/auth/permissions";
import {
  adminRoleAdminService,
  AdminRoleServiceError,
  type AdminRoleInput,
  type UpdateAdminRoleInput,
} from "@/services/admin/admin-role.service";

export interface AdminRoleActionState {
  success: boolean;
  error?: string;
}

function toActionState(err: unknown): AdminRoleActionState {
  if (err instanceof AdminRoleServiceError) {
    return { success: false, error: err.message };
  }
  console.error("[admin/roles] unexpected error", err);
  return { success: false, error: "حدث خطأ غير متوقع. حاول مرة أخرى." };
}

export async function listRolesAction() {
  await requirePermission(ROLE_MANAGE_PERMISSION);
  return adminRoleAdminService.listRoles();
}

export async function createRoleAction(input: AdminRoleInput): Promise<AdminRoleActionState> {
  const session = await requirePermission(ROLE_MANAGE_PERMISSION);
  try {
    await adminRoleAdminService.createRole(input, session.userId);
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function updateRoleAction(id: string, input: UpdateAdminRoleInput): Promise<AdminRoleActionState> {
  const session = await requirePermission(ROLE_MANAGE_PERMISSION);
  try {
    await adminRoleAdminService.updateRole(id, input, session.userId);
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function deleteRoleAction(id: string): Promise<AdminRoleActionState> {
  const session = await requirePermission(ROLE_MANAGE_PERMISSION);
  try {
    await adminRoleAdminService.deleteRole(id, session.userId);
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function assignRoleToUserAction(userId: string, roleId: string | null): Promise<AdminRoleActionState> {
  const session = await requirePermission(ROLE_MANAGE_PERMISSION);
  try {
    await adminRoleAdminService.assignRoleToUser(userId, roleId, session.userId);
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}
