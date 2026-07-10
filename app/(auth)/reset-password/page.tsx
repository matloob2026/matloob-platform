"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { apiFetch, ApiRequestError } from "@/lib/api-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("رابط إعادة التعيين غير صالح.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : "تعذر إعادة تعيين كلمة المرور.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <h1 className="font-display text-xl font-extrabold text-navy-950">تم تحديث كلمة المرور</h1>
        <p className="mt-2 text-sm text-text-500">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.</p>
        <Button size="sm" className="mt-6" onClick={() => router.push("/login")}>
          تسجيل الدخول
        </Button>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="text-center">
          <h1 className="font-display text-xl font-extrabold text-navy-950">إعادة تعيين كلمة المرور</h1>
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">{error}</p>
        )}
        {!token && (
          <p className="text-center text-sm text-red-600">
            رابط إعادة التعيين غير صالح.{" "}
            <Link href="/forgot-password" className="font-semibold text-teal-700 hover:underline">
              اطلب رابطاً جديداً
            </Link>
          </p>
        )}
        <FormField label="كلمة المرور الجديدة">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </FormField>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !token}>
          {isSubmitting ? "جارٍ الحفظ..." : "حفظ كلمة المرور الجديدة"}
        </Button>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
