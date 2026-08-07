import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth/auth";
import { Card } from "@/components/ui/Card";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";

export const metadata: Metadata = {
  title: "إعدادات الحساب | مطلوب",
};

/**
 * Account Settings module: account info + self-service password
 * change, the marketing-site counterpart to the Admin Profile page
 * (src/app/admin/(protected)/profile). Deliberately separate from
 * /profile (display name/phone/city/bio — public-facing profile
 * data): this page is account security, not profile content.
 */
export default async function AccountSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account-settings");
  }

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <SiteHeader title="إعدادات الحساب" />
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-extrabold text-navy-950 sm:text-3xl">إعدادات الحساب</h1>
        </div>

        <Card>
          <h3 className="mb-4 font-display text-lg font-bold text-navy-950">معلومات الحساب</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-text-400">الاسم</p>
              <p className="font-bold text-navy-950">{session.user.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-text-400">البريد الإلكتروني</p>
              <p className="font-bold text-navy-950" dir="ltr">
                {session.user.email}
              </p>
            </div>
          </div>
        </Card>

        <ChangePasswordForm />
      </div>
    </main>
  );
}
