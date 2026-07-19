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

/** Returns the page only if BOTH locale rows exist, are for an active
 * page, and the page isn't the reserved "homepage" slug. Returns
 * `null` for anything else (not found, inactive, or partially
 * configured) so the caller can render a single, safe not-found
 * response rather than a half-populated page. */
export async function getPublicStaticPage(slug: string): Promise<PublicStaticPage | null> {
  const rows = await prisma.pageContent.findMany({ where: { page: slug, section: SECTION } });
  if (rows.length === 0) return null;

  const ar = rows.find((r: { locale: string }) => r.locale === "ar");
  const en = rows.find((r: { locale: string }) => r.locale === "en");
  if (!ar || !en) return null;
  if (!ar.isPublished || !en.isPublished) return null;
  if (!ar.heading || !ar.body || !en.heading || !en.body) return null;

  return {
    slug,
    titleAr: ar.heading,
    titleEn: en.heading,
    contentAr: ar.body,
    contentEn: en.body,
  };
}
