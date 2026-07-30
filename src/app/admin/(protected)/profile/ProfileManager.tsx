"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/ToastProvider";
import { changeOwnPasswordAction } from "./actions";

const ROLE_LABEL: Record<string, string> = { ADMIN: "مدير", MODERATOR: "مشرف" };

/** Administration module: Admin Profile — account info + self-service
 * password change. Reuses the existing Card/FormField/Button UI, and
 * the existing AuthService.changePassword capability. */
export function ProfileManager({ name, email, role }: { name: string; email: string; role: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | undefined>();

  function handleChangePassword() {
    setFormError(undefined);

    if (newPassword.length < 8) {
      setFormError("كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("كلمتا المرور الجديدتان غير متطابقتين.");
      return;
    }

    startTransition(async () => {
      const result = await changeOwnPasswordAction(currentPassword, newPassword);
      if (!result.success) {
        setFormError(result.error);
        return;
      }
      showToast("تم تغيير كلمة المرور بنجاح. الرجاء تسجيل الدخول مجدداً.", "success");
      router.push("/admin/login");
    });
  }

  return (
    <div>
      <PageHeader title="الملف الشخصي" description="معلومات حسابك وإعدادات الأمان" />

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-display text-lg font-bold text-navy-950">معلومات الحساب</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-text-400">الاسم</p>
              <p className="font-bold text-navy-950">{name}</p>
            </div>
            <div>
              <p className="text-text-400">البريد الإلكتروني</p>
              <p className="font-bold text-navy-950" dir="ltr">
                {email}
              </p>
            </div>
            <div>
              <p className="text-text-400">الدور</p>
              <Badge tone="info">{ROLE_LABEL[role] ?? role}</Badge>
            </div>
          </div>
        </Card>

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
              سيتم تسجيل خروجك من كل الأجهزة الأخرى بعد تغيير كلمة المرور، وستحتاج لتسجيل الدخول مرة أخرى هنا أيضاً.
            </p>
            <Button onClick={handleChangePassword} disabled={isPending} className="w-full justify-center">
              {isPending ? "جارٍ الحفظ..." : "تغيير كلمة المرور"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
