"use server";

import { redirect } from "next/navigation";
import { verifyMockCredentials, createAdminSession, destroyAdminSession } from "@/auth/mock-session";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "الرجاء إدخال البريد الإلكتروني وكلمة المرور." };
  }

  const session = verifyMockCredentials(email, password);
  if (!session) {
    return { error: "بيانات الدخول غير صحيحة." };
  }

  await createAdminSession(session);
  redirect("/admin/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroyAdminSession();
  redirect("/admin/login");
}
