"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { apiFetch, ApiRequestError } from "@/lib/api-client";

function ResendVerification() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Always resolves — the API never reveals whether the account
      // exists or is already verified, see the route itself.
      await apiFetch("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    } finally {
      setSent(true);
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <p className="mt-4 text-sm text-text-500">
        إذا كان بريدك مرتبطاً بحساب غير مُفعّل، ستصلك رسالة تفعيل جديدة خلال دقائق.
      </p>
    );
  }

  return (
    <form onSubmit={handleResend} className="mt-4 space-y-3 border-t border-border pt-4 text-right">
      <p className="text-sm text-text-500">لم يصلك رابط التفعيل؟ أدخل بريدك لإعادة الإرسال.</p>
      <FormField label="البريد الإلكتروني">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </FormField>
      <Button type="submit" size="sm" variant="outline" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "جارٍ الإرسال..." : "إعادة إرسال رابط التفعيل"}
      </Button>
    </form>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("رابط التفعيل غير صالح.");
      return;
    }

    apiFetch("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) })
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof ApiRequestError ? err.error.message : "تعذر تفعيل الحساب.");
      });
  }, [token]);

  return (
    <Card className="mx-auto max-w-md text-center">
      {status === "pending" && <p className="text-sm text-text-500">جارٍ تفعيل حسابك...</p>}

      {status === "success" && (
        <>
          <h1 className="font-display text-xl font-extrabold text-navy-950">تم تفعيل حسابك بنجاح!</h1>
          <p className="mt-2 text-sm text-text-500">يمكنك الآن تسجيل الدخول.</p>
          <Link href="/login" className="mt-6 inline-block">
            <Button size="sm">تسجيل الدخول</Button>
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <h1 className="font-display text-xl font-extrabold text-navy-950">تعذر تفعيل الحساب</h1>
          <p className="mt-2 text-sm text-red-600">{message}</p>
          <Link href="/login" className="mt-6 inline-block">
            <Button size="sm" variant="outline">
              العودة لتسجيل الدخول
            </Button>
          </Link>
          <ResendVerification />
        </>
      )}
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <AuthHeader />
      <Suspense fallback={null}>
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}
