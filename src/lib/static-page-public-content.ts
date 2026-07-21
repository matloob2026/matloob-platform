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

async function getPublicStaticPageNavLinksFor(placements: string[]): Promise<PublicStaticPageNavLink[]> {
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
      (r: { title: string | null; navPlacement: string }) => Boolean(r.title) && placements.includes(r.navPlacement)
    )
    .sort((a: { navOrder: number }, b: { navOrder: number }) => a.navOrder - b.navOrder)
    .map((r: { slug: string; title: string | null }) => ({ slug: r.slug, title: r.title as string }));
}

/** Published static pages configured for the homepage's footer "Legal"
 * links column (navPlacement "footer" or "both") — see
 * src/app/(marketing)/homepage-render.ts. Returns [] when none are
 * configured yet — the caller then leaves the original hardcoded
 * placeholder links untouched (see CMS:STATIC_PAGES_NAV markers in
 * src/content/marketing/homepage-body.html). */
export async function getPublicStaticPageFooterNavLinks(): Promise<PublicStaticPageNavLink[]> {
  return getPublicStaticPageNavLinksFor(["footer", "both"]);
}

/** Published static pages configured for the homepage's main
 * navigation bar (navPlacement "main" or "both") — appended after the
 * existing hardcoded nav links (see CMS:MAIN_NAV_STATIC_PAGES markers
 * in src/content/marketing/homepage-body.html); never replaces or
 * duplicates them. Returns [] when none are configured. */
export async function getPublicStaticPageMainNavLinks(): Promise<PublicStaticPageNavLink[]> {
  return getPublicStaticPageNavLinksFor(["main", "both"]);
}
