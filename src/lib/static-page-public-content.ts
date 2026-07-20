/**
 * Read-only static page content for the public dynamic route
 * (src/app/pages/[slug]/page.tsx) — Checkpoint 03.
 *
 * Mirrors src/lib/homepage-public-content.ts: a thin, page-scoped data
 * loader (not the admin CRUD service) reading the SAME `PageContent`
 * rows the Admin Static Pages CMS screen manages
 * (src/services/admin/static-page.service.ts). No auth requirement —
 * this is read by a public page — and it only ever returns active,
 * existing pages; the caller is expected to render a 404 (`notFound()`)
 * when this returns `null`, which covers both "doesn't exist" and
 * "exists but inactive" with the same response, exactly as required.
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

/** All currently active/published static pages, for the homepage
 * footer's "Legal" links column
 * (see src/app/(marketing)/homepage-render.ts). Returns [] when none
 * are active yet — the caller then leaves the original hardcoded
 * placeholder links untouched (see CMS:STATIC_PAGES_NAV markers in
 * src/content/marketing/homepage-body.html). */
export async function getPublicStaticPageNavLinks(): Promise<PublicStaticPageNavLink[]> {
  const rows = await prisma.pageContent.findMany({
    where: { section: SECTION, locale: "ar", isPublished: true },
    orderBy: { page: "asc" },
  });
  return rows
    .filter((r: { heading: string | null }) => Boolean(r.heading))
    .map((r: { page: string; heading: string | null }) => ({ slug: r.page, title: r.heading as string }));
}
