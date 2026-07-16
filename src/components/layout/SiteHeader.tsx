"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserMenu } from "./UserMenu";

/**
 * Unified top navigation bar, reused on every authenticated/internal
 * page (Create Request, My Requests, Profile, Request Details, Edit
 * Request, and any future dashboard page). Always three zones:
 *   LEFT   — the current user chip (avatar dropdown) when signed in,
 *            or Login/Register when not
 *   CENTER — "مطلوب" logo/wordmark — always returns to "/"
 *   RIGHT  — a Home button — always returns to "/"
 * Clicking the logo or the Home button always returns to Home — no
 * page ever traps the user. The left zone reflects sign-in state
 * instantly via useSession(), no page refresh needed.
 */
export function SiteHeader({ title }: { title?: string }) {
  const { data: session, status } = useSession();

  return (
    <header dir="rtl" className="mx-auto mb-6 grid max-w-3xl grid-cols-3 items-center px-1">
      <div className="flex justify-start">
        {status === "authenticated" && session.user ? (
          <UserMenu
            name={session.user.name ?? session.user.email ?? "حسابي"}
            email={session.user.email}
            imageUrl={session.user.image}
          />
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

      <div className="flex flex-col items-center justify-center">
        <Link
          href="/"
          className="font-display text-lg font-extrabold text-navy-950 hover:text-teal-700"
          aria-label="الذهاب إلى الصفحة الرئيسية لمطلوب"
        >
          مطلوب
        </Link>
        {title && <span className="hidden text-xs font-semibold text-text-400 sm:inline">{title}</span>}
      </div>

      <div className="flex justify-end">
        <Link
          href="/"
          aria-label="الذهاب إلى الصفحة الرئيسية"
          className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-semibold text-text-500 shadow-sm transition-colors hover:bg-surface-muted hover:text-teal-700"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
          </svg>
          الرئيسية
        </Link>
      </div>
    </header>
  );
}
