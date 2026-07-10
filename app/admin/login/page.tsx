"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-gradient-to-l from-navy-900 to-teal-500 py-3 font-bold text-white shadow-card transition hover:shadow-lg disabled:opacity-60"
    >
      {pending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
    </button>
  );
}

export default function AdminLoginPage() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-white p-8 shadow-card-lg">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-extrabold text-navy-950">مطلوب</h1>
          <p className="mt-1 text-sm text-text-500">لوحة تحكم المنصة</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-700">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="admin@matloob.com"
              className="w-full rounded-lg border border-border-strong px-4 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-text-700">
              كلمة المرور
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-border-strong px-4 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
          )}

          <SubmitButton />
        </form>

        <p className="mt-6 text-center text-xs text-text-400">
          بيانات تجريبية: admin@matloob.com / matloob-admin
        </p>
      </div>
    </main>
  );
}
