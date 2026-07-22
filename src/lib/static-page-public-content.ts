/**
 * Read-only static page content for the public dynamic route
 * (src/app/pages/[slug]/page.tsx) — Checkpoint 03 — plus the
 * navigation-placement readers used by the homepage's main nav and
 * footer (Checkpoint 04).
 *
 * Mirrors src/lib/homepage-public-content.ts: a thin, page-scoped data
 * loader (not the admin CRUD service) reading the SAME `PageContent`
 * rows the Admin Static Pages CMS screen manages
 * (src/services/admin/static-page.service.ts). No auth requirement —
 * this is read by public pages — and every function here only ever
 * returns active/published data; the caller is expected to render a
 * 404 (`notFound()`) for `getPublicStaticPage` returning `null`, or
 * simply render nothing extra when a nav-link list is empty.
 */

import { prisma } from "@/lib/prisma";

const SECTION = "main";

export interface PublicStaticPage {
  slug: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
}

/** Returns the page only if its Arabic row exists, is active, and has
 * both a heading and body — the public route only ever renders Arabic
 * content (see src/app/pages/[slug]/page.tsx's `DEFAULT_LOCALE`), so
 * requiring the English row too would block publishing an
 * Arabic-only page even though nothing public actually needs English
 * yet (Checkpoint 04: admins are no longer forced to fill in both
 * languages). Returns `null` for anything else (not found, inactive
 * Arabic row, or missing Arabic heading/body) so the caller can render
 * a single, safe not-found response. */
export async function getPublicStaticPage(slug: string): Promise<PublicStaticPage | null> {
  const rows = await prisma.pageContent.findMany({ where: { page: slug, section: SECTION } });
  if (rows.length === 0) return null;

  const ar = rows.find((r: { locale: string }) => r.locale === "ar");
  const en = rows.find((r: { locale: string }) => r.locale === "en");
  if (!ar || !ar.isPublished) return null;
  if (!ar.heading || !ar.body) return null;

  return {
    slug,
    titleAr: ar.heading,
    titleEn: en?.heading ?? ar.heading,
    contentAr: ar.body,
    contentEn: en?.body ?? ar.body,
  };
}

export interface PublicStaticPageNavLink {
  slug: string;
  title: string;
}

/** Reads `{ navPlacement, navOrder }` back out of `PageContent.extra`
 * — the same free-form Json field
 * src/services/admin/static-page.service.ts's admin CRUD writes to.
 * Unknown/missing/malformed values default to "none"/0 so a row from
 * before Checkpoint 04 (no `extra` yet) simply doesn't appear in any
 * nav list, rather than erroring. */
function readNavMeta(extra: unknown): { navPlacement: string; navOrder: number } {
  if (extra && typeof extra === "object" && !Array.isArray(extra)) {
    const obj = extra as Record<string, unknown>;
    const placement = obj.navPlacement;
    const order = obj.navOrder;
    return {
      navPlacement: typeof placement === "string" ? placement : "none",
      navOrder: typeof order === "number" && Number.isFinite(order) ? order : 0,
    };
  }
  return { navPlacement: "none", navOrder: 0 };
}

/**
 * CMS Checkpoint 06 (final Static Pages / Public Pages CMS task) —
 * "fixed-slot" pages. These 7 slugs correspond to the site's existing
 * hardcoded placeholder links (Contact, How It Works, About, Terms,
 * Privacy, FAQ, Help Center — see the "الشركة"/"الدعم"/"قانوني" footer
 * columns and the main nav in homepage-body.html). Their EXISTING
 * hardcoded link's `href` is fixed in place to point at the real page
 * once it's published (see homepage-render.ts) — the label text and
 * position designed into the homepage stay untouched; nothing new is
 * appended for them.
 *
 * Only "contact" and "how-it-works" also need excluding from
 * `getPublicStaticPageMainNavLinks` below (see its own docstring) —
 * those two are the only ones that ALSO live inside the same main nav
 * whose "appended" list that function drives. "terms"/"privacy" are
 * excluded from nothing: they're exactly the pages
 * `getPublicStaticPageFooterNavLinks`'s dynamic "قانوني" list is
 * designed to carry. "about"/"faq"/"help-center" don't appear in
 * either dynamic list's own column, so no exclusion applies to them.
 */
export const KNOWN_FIXED_SLOT_SLUGS = [
  "contact",
  "how-it-works",
  "about",
  "terms",
  "privacy",
  "faq",
  "help-center",
] as const;

/** Which of the fixed-slot slugs above currently resolve to a real,
 * active page — used by homepage-render.ts to decide which hardcoded
 * `href="#"` placeholders can be safely pointed at `/pages/{slug}`.
 * A slug not yet created/published is simply omitted, so its
 * placeholder link is left exactly as-is (safe fallback). */
export async function getActiveKnownPageSlugs(): Promise<Set<string>> {
  const results = await Promise.all(
    KNOWN_FIXED_SLOT_SLUGS.map(async (slug) => ({ slug, page: await getPublicStaticPage(slug) }))
  );
  return new Set(results.filter((r) => r.page !== null).map((r) => r.slug));
}

async function getPublicStaticPageNavLinksFor(
  placements: string[],
  excludeSlugs: readonly string[] = []
): Promise<PublicStaticPageNavLink[]> {
  const rows = await prisma.pageContent.findMany({
    where: { section: SECTION, locale: "ar", isPublished: true },
  });
  return rows
    .map((r: { page: string; heading: string | null; extra: unknown }) => ({
      slug: r.page,
      title: r.heading,
      ...readNavMeta(r.extra),
    }))
    .filter(
      (r: { title: string | null; navPlacement: string; slug: string }) =>
        Boolean(r.title) && placements.includes(r.navPlacement) && !excludeSlugs.includes(r.slug)
    )
    .sort((a: { navOrder: number }, b: { navOrder: number }) => a.navOrder - b.navOrder)
    .map((r: { slug: string; title: string | null }) => ({ slug: r.slug, title: r.title as string }));
}

/** Published static pages configured for the homepage's footer "Legal"
 * links column (navPlacement "footer" or "both") — see
 * src/app/(marketing)/homepage-render.ts. Returns [] when none are
 * configured yet — the caller then leaves the original hardcoded
 * placeholder links untouched (see CMS:STATIC_PAGES_NAV markers in
 * src/content/marketing/homepage-body.html). No fixed-slot exclusions
 * are needed here — "terms"/"privacy" are exactly the pages this list
 * is meant to carry once published. */
export async function getPublicStaticPageFooterNavLinks(): Promise<PublicStaticPageNavLink[]> {
  return getPublicStaticPageNavLinksFor(["footer", "both"]);
}

/** Published static pages configured for the homepage's main
 * navigation bar (navPlacement "main" or "both") — appended after the
 * existing hardcoded nav links (see CMS:MAIN_NAV_STATIC_PAGES markers
 * in src/content/marketing/homepage-body.html); never replaces or
 * duplicates them. Excludes "contact"/"how-it-works" specifically:
 * those two already have their OWN fixed link inside this same main
 * nav (see getActiveKnownPageSlugs/homepage-render.ts), so appending
 * them again here would show the same page twice in one menu. */
export async function getPublicStaticPageMainNavLinks(): Promise<PublicStaticPageNavLink[]> {
  return getPublicStaticPageNavLinksFor(["main", "both"], ["contact", "how-it-works"]);
}
