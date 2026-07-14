"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserMenu } from "./UserMenu";

/**
 * Standardized top navigation bar for every secondary/internal page
 * (Create Request, My Requests, Profile, Request Details, Edit
 * Request, and any future dashboard page). Always three zones:
 *   LEFT   — Home link (icon), always returns to "/"
 *   CENTER — "مطلوب" logo/wordmark, also always returns to "/"
 *   RIGHT  — the current page's title, plus the auth-aware menu
 *            (avatar dropdown when signed in, Login/Register when not)
 * Clicking Home or the logo always returns to Home — no page ever
 * traps the user. The right zone reflects sign-in state instantly via
 * useSession(), no page refresh needed.
 */
export function SiteHeader({ title }: { title?: string }) {
  const { data: session, status } = useSession();

  return (
    <header dir="rtl" className="mx-auto mb-6 grid max-w-3xl grid-cols-3 items-center px-1">
      <div className="flex justify-start">
        <Link
          href="/"
          aria-label="الذهاب إلى الصفحة الرئيسية"
          className="flex items-center gap-1.5 text-sm font-semibold text-text-500 hover:text-teal-700"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
          </svg>
          الرئيسية
        </Link>
      </div>

      <div className="flex justify-center">
        <Link
          href="/"
          className="font-display text-lg font-extrabold text-navy-950 hover:text-teal-700"
          aria-label="الذهاب إلى الصفحة الرئيسية لمطلوب"
        >
          مطلوب
        </Link>
      </div>

      <div className="flex items-center justify-end gap-3">
        {title && <span className="hidden text-sm font-semibold text-text-500 sm:inline">{title}</span>}

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
      </div>
    </header>
  );
}
