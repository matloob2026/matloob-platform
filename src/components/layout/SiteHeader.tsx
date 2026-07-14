"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserMenu } from "./UserMenu";

/**
 * Every page that renders this always has a clickable way back to
 * Home (the logo), and the right-hand side reflects the actual
 * sign-in state via useSession() — switching to the user's
 * avatar/name/dropdown the instant a session exists, no page refresh
 * needed. This is intentionally a new, small, separate component
 * rather than a change to the locked marketing homepage — see
 * HomepageAuthNav for the equivalent behavior grafted onto that
 * page's existing (unmodified) markup.
 */
export function SiteHeader() {
  const { data: session, status } = useSession();

  return (
    <header dir="rtl" className="mx-auto mb-6 flex max-w-3xl items-center justify-between px-1">
      <Link
        href="/"
        className="font-display text-lg font-extrabold text-navy-950 hover:text-teal-700"
        aria-label="الذهاب إلى الصفحة الرئيسية لمطلوب"
      >
        مطلوب
      </Link>

      {status === "authenticated" && session.user ? (
        <UserMenu name={session.user.name ?? session.user.email ?? "حسابي"} imageUrl={session.user.image} />
      ) : status === "unauthenticated" ? (
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-sm font-semibold text-text-500 hover:text-teal-700">
            تسجيل دخول
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-navy-950 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-navy-900"
          >
            إنشاء حساب
          </Link>
        </div>
      ) : (
        <div className="h-8 w-20" aria-hidden="true" />
      )}
    </header>
  );
}
