import Link from "next/link";

/**
 * Shared top bar for every page under src/app/(auth)/**. Two things
 * every one of those pages needs: a way back to the homepage that
 * doesn't rely on the browser back button (useful after a redirect
 * chain like register -> verify-email -> login), and the same brand
 * mark used elsewhere so these pages don't feel disconnected from the
 * rest of the site. Deliberately NOT touching the locked homepage
 * itself — this is a new, separate component.
 */
export function AuthHeader() {
  return (
    <div dir="rtl" className="mx-auto mb-6 flex max-w-md items-center justify-between px-1">
      <Link
        href="/"
        className="font-display text-lg font-extrabold text-navy-950 hover:text-teal-700"
        aria-label="الذهاب إلى الصفحة الرئيسية لمطلوب"
      >
        مطلوب
      </Link>
      <Link
        href="/"
        className="text-sm font-semibold text-text-500 hover:text-teal-700"
      >
        ← العودة للرئيسية
      </Link>
    </div>
  );
}
