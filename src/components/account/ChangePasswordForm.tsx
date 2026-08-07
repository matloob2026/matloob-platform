"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/ToastProvider";
import { apiFetch, ApiRequestError } from "@/lib/api-client";

/**
 * Account Settings module: self-service password change, mirroring
 * the Admin Profile page's ProfileManager.tsx (same three-field form,
 * same client-side length/match checks before hitting the API). Calls
 * POST /api/account/change-password, then signs the user out and
 * redirects to /login so they re-authenticate with the new password —
 * this app's user session is a JWT cookie (see
 * src/auth/auth.config.ts), which the server-side password change
 * can't invalidate by itself.
 */
export function ChangePasswordForm() {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [isBusy, setIsBusy] = useState(false);

  async function handleSubmit() {
    setFormError(undefined);

    if (newPassword.length < 8) {
      setFormError("كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("كلمتا المرور الجديدتان غير متطابقتين.");
      return;
    }

    setIsBusy(true);
    try {
      await apiFetch("/api/account/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      showToast("تم تغيير كلمة المرور بنجاح. الرجاء تسجيل الدخول مجدداً.", "success");
      await signOut({ callbackUrl: "/login" });
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.error.message : "تعذر تغيير كلمة المرور.";
      setFormError(message);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">تغيير كلمة المرور</h3>

      {formError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          {formError}
        </div>
      )}

      <div className="space-y-4">
        <FormField label="كلمة المرور الحالية">
          <Input
            type="password"
            dir="ltr"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </FormField>
        <FormField label="كلمة المرور الجديدة" hint="8 أحرف على الأقل">
          <Input type="password" dir="ltr" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </FormField>
        <FormField label="تأكيد كلمة المرور الجديدة">
          <Input
            type="password"
            dir="ltr"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </FormField>
        <p className="text-xs text-text-400">
          سيتم تسجيل خروجك بعد تغيير كلمة المرور، وستحتاج لتسجيل الدخول مرة أخرى بكلمة المرور الجديدة.
        </p>
        <Button onClick={handleSubmit} disabled={isBusy} className="w-full justify-center">
          {isBusy ? "جارٍ الحفظ..." : "تغيير كلمة المرور"}
        </Button>
      </div>
    </Card>
  );
}
