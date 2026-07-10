"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, FormField, Select } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { apiFetch, ApiRequestError } from "@/lib/api-client";

type Role = "BUYER" | "SUPPLIER" | "BOTH";

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("BUYER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ displayName, email, password, role }),
      });
      setRegisteredEmail(email);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : "حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (registeredEmail) {
    return (
      <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
        <Card className="mx-auto max-w-md text-center">
          <h1 className="font-display text-xl font-extrabold text-navy-950">تحقق من بريدك الإلكتروني</h1>
          <p className="mt-3 text-sm leading-relaxed text-text-700">
            أرسلنا رابط تفعيل إلى <span className="font-semibold">{registeredEmail}</span>. افتح
            الرابط لتفعيل حسابك، ثم سجّل دخولك.
          </p>
          <Link href="/login" className="mt-6 inline-block">
            <Button size="sm">الذهاب لتسجيل الدخول</Button>
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <Card className="mx-auto max-w-md">
        <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
          <div className="text-center">
            <h1 className="font-display text-2xl font-extrabold text-navy-950">إنشاء حساب</h1>
            <p className="mt-1 text-sm text-text-500">انضم إلى مطلوب مجاناً</p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <FormField label="الاسم">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
            />
          </FormField>

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
              minLength={8}
              autoComplete="new-password"
            />
          </FormField>

          <FormField label="نوع الحساب">
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="BUYER">أبحث عن خدمات (طالب)</option>
              <option value="SUPPLIER">أقدم خدمات (مورد)</option>
              <option value="BOTH">كلاهما</option>
            </Select>
          </FormField>

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
          </Button>

          <p className="text-center text-sm text-text-500">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="font-semibold text-teal-700 hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </form>
      </Card>
    </main>
  );
}
