"use server";

/**
 * Server actions backing the real Admin Users screen
 * (src/app/admin/(protected)/users/page.tsx + UsersManager.tsx). Same
 * thin-wrapper shape as every other CMS actions.ts in this codebase:
 * authorize, call the admin service, map the result to a small
 * serializable state object.
 *
 * Reads require `users:view` (ADMIN and MODERATOR — unchanged since
 * Checkpoint 01); role/status changes, password-reset triggers, and
 * session revocation require `USER_MANAGE_PERMISSION` (ADMIN only).
 */

import { requirePermission } from "@/auth/guards";
import { USER_MANAGE_PERMISSION } from "@/auth/permissions";
import {
  adminUserAdminService,
  AdminUserServiceError,
  type UserRoleValue,
  type UserStatusValue,
  type ListUsersFilters,
} from "@/services/admin/admin-user.service";

export interface AdminUserActionState {
  success: boolean;
  error?: string;
}

function toActionState(err: unknown): AdminUserActionState {
  if (err instanceof AdminUserServiceError) {
    return { success: false, error: err.message };
  }
  console.error("[admin/users] unexpected error", err);
  return { success: false, error: "حدث خطأ غير متوقع. حاول مرة أخرى." };
}

export async function listUsersAction(filters?: ListUsersFilters) {
  await requirePermission("users:view");
  return adminUserAdminService.listUsers(filters);
}

export async function setUserRoleAction(id: string, role: UserRoleValue): Promise<AdminUserActionState> {
  const session = await requirePermission(USER_MANAGE_PERMISSION);
  try {
    await adminUserAdminService.setRole(id, role, session.userId);
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function setUserStatusAction(id: string, status: UserStatusValue): Promise<AdminUserActionState> {
  const session = await requirePermission(USER_MANAGE_PERMISSION);
  try {
    await adminUserAdminService.setStatus(id, status, session.userId);
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function sendPasswordResetAction(id: string): Promise<AdminUserActionState> {
  const session = await requirePermission(USER_MANAGE_PERMISSION);
  try {
    await adminUserAdminService.sendPasswordReset(id, session.userId);
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function listUserSessionsAction(userId: string) {
  await requirePermission(USER_MANAGE_PERMISSION);
  return adminUserAdminService.listSessions(userId);
}

export async function revokeUserSessionAction(sessionId: string, userId: string): Promise<AdminUserActionState> {
  const session = await requirePermission(USER_MANAGE_PERMISSION);
  try {
    await adminUserAdminService.revokeSession(sessionId, userId, session.userId);
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}
