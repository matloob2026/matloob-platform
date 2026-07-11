"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { apiFetch } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Always resolves — the API itself never reveals whether the
      // email exists, see src/app/api/auth/forgot-password/route.ts.
      await apiFetch("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
    } finally {
      setSent(true);
      setIsSubmitting(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <AuthHeader />
      <Card className="mx-auto max-w-md">
        {sent ? (
          <div className="text-center">
            <h1 className="font-display text-xl font-extrabold text-navy-950">تحقق من بريدك</h1>
            <p className="mt-2 text-sm text-text-500">
              إذا كان هناك حساب مرتبط بهذا البريد، ستصلك رسالة لإعادة تعيين كلمة المرور خلال دقائق.
            </p>
            <Link href="/login" className="mt-6 inline-block">
              <Button size="sm" variant="outline">
                العودة لتسجيل الدخول
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center">
              <h1 className="font-display text-xl font-extrabold text-navy-950">نسيت كلمة المرور؟</h1>
              <p className="mt-1 text-sm text-text-500">
                أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.
              </p>
            </div>
            <FormField label="البريد الإلكتروني">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </FormField>
            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "جارٍ الإرسال..." : "إرسال رابط إعادة التعيين"}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
