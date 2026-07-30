"use server";

/**
 * Server action backing the Admin Profile page
 * (src/app/admin/(protected)/profile/page.tsx + ProfileManager.tsx).
 * Any authenticated admin/moderator can change their OWN password —
 * no special permission beyond being logged in (`requireAdminSession`,
 * not `requirePermission`), same as any account-settings page.
 *
 * Reuses `AuthService.changePassword` (src/services/auth.service.ts)
 * — the exact same password-change capability added for this module,
 * not a duplicate implementation.
 */

import { requireAdminSession } from "@/auth/guards";
import { destroyAdminSession } from "@/auth/session";
import { authService, AuthError } from "@/services/auth.service";

export interface ChangePasswordState {
  success: boolean;
  error?: string;
}

export async function changeOwnPasswordAction(
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordState> {
  const session = await requireAdminSession();

  try {
    await authService.changePassword(session.userId, currentPassword, newPassword);
  } catch (err) {
    if (err instanceof AuthError) {
      const message =
        err.code === "WEAK_PASSWORD"
          ? "كلمة المرور الجديدة قصيرة جداً."
          : "كلمة المرور الحالية غير صحيحة.";
      return { success: false, error: message };
    }
    console.error("[admin/profile] unexpected error", err);
    return { success: false, error: "حدث خطأ غير متوقع. حاول مرة أخرى." };
  }

  // changePassword revokes every standing session for this user,
  // including the one making this request right now — clear the
  // cookie too so the next navigation correctly redirects to login
  // instead of holding a cookie that points at an already-deleted row.
  await destroyAdminSession();

  return { success: true };
}
