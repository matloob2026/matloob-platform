import Link from "next/link";

/**
 * Reusable end-of-page call to action for public pages — Checkpoint
 * 06 (final Static Pages / Public Pages CMS task). One component, used
 * by every page rendered through the unified static-page template
 * (src/app/pages/[slug]/page.tsx) rather than a bespoke CTA per page.
 *
 * Links straight to the existing `/create-request` route — that route
 * already redirects an unauthenticated visitor to `/login` itself (see
 * its own `auth()` check), exactly the same way the homepage's own CTA
 * buttons link to `/create-request` directly. No new auth flow is
 * introduced here.
 */
export function PublicPageCta({
  heading = "عندك طلب؟ مطلوب يوصلك بأفضل العروض",
  body = "انشر طلبك الآن مجاناً وخلي الموردين يوصلولك بعروضهم.",
  buttonLabel = "أضف طلبك الآن",
}: {
  heading?: string;
  body?: string;
  buttonLabel?: string;
}) {
  return (
    <div className="relative mt-10 overflow-hidden rounded-card bg-gradient-to-br from-navy-950 to-teal-700 px-6 py-10 text-center shadow-card-lg sm:px-10 sm:py-12">
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-teal-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-teal-300/20 blur-3xl" />
      <div className="relative">
        <h2 className="font-display text-xl font-extrabold text-white sm:text-2xl">{heading}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-teal-100 sm:text-base">{body}</p>
        <Link
          href="/create-request"
          className="mt-6 inline-flex items-center justify-center rounded-pill bg-white px-7 py-3 text-sm font-bold text-navy-950 shadow-card transition hover:bg-teal-50 sm:text-base"
        >
          {buttonLabel}
        </Link>
      </div>
    </div>
  );
}
