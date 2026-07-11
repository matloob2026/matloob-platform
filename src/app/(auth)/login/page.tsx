"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { OAuthPlaceholders } from "@/components/auth/OAuthPlaceholders";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/my-requests";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await signIn("credentials", { email, password, redirect: false });

    if (!result || result.error) {
      // NextAuth's Credentials provider always surfaces a generic
      // CredentialsSignin error regardless of the underlying AuthError
      // code (invalid password vs. unverified account, etc.) — see
      // the note in src/auth/auth.config.ts's authorize() callback.
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة، أو أن الحساب لم يتم تفعيله بعد.");
      setIsSubmitting(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card className="mx-auto max-w-md">
      <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
        <div className="text-center">
          <h1 className="font-display text-2xl font-extrabold text-navy-950">تسجيل الدخول</h1>
          <p className="mt-1 text-sm text-text-500">أهلاً بعودتك إلى مطلوب</p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <FormField label="البريد الإلكتروني">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </FormField>

        <FormField label="كلمة المرور">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </FormField>

        <div className="text-left text-sm">
          <Link href="/forgot-password" className="font-semibold text-teal-700 hover:underline">
            نسيت كلمة المرور؟
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "جارٍ الدخول..." : "تسجيل الدخول"}
        </Button>

        <p className="text-center text-sm text-text-500">
          ليس لديك حساب؟{" "}
          <Link href="/register" className="font-semibold text-teal-700 hover:underline">
            إنشاء حساب جديد
          </Link>
        </p>
      </form>

      <div className="mt-5">
        <OAuthPlaceholders />
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <AuthHeader />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
