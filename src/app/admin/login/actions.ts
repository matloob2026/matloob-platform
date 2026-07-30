"use server";

/**
 * Admin login/logout — now backed by the real, database-backed admin
 * session (see src/auth/session.ts). Reuses the exact same
 * `verifyAdminCredentials`/`createAdminSession`/`destroyAdminSession`
 * functions the rest of the Admin Dashboard's guards already depend
 * on; nothing about this action's shape changed from the previous
 * mock-session version, so no caller (the login form) needed to
 * change either.
 */

import { redirect } from "next/navigation";
import { verifyAdminCredentials, createAdminSession, destroyAdminSession, AdminAuthError } from "@/auth/session";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "الرجاء إدخال البريد الإلكتروني وكلمة المرور." };
  }

  try {
    const identity = await verifyAdminCredentials(email, password);
    await createAdminSession(identity);
  } catch (err) {
    if (err instanceof AdminAuthError) {
      return { error: err.message };
    }
    console.error("[admin/login] unexpected error", err);
    return { error: "حدث خطأ غير متوقع. حاول مرة أخرى." };
  }

  redirect("/admin/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}
