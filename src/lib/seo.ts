/**
 * The ONE metadata-resolution strategy for the public site — used by
 * the homepage (src/app/(marketing)/page.tsx) and every Static Page
 * (src/app/pages/[slug]/page.tsx) so there is exactly one place this
 * logic lives, not duplicated per route.
 *
 * Resolution order (exactly as this task specifies):
 *   1. Page-specific SEO   — SeoSetting(entityType, entityId, locale)
 *   2. Global SEO defaults — SeoSetting("global", null, locale)
 *   3. Safe fallback       — the `fallback` the caller passes in
 *      (normally that page's own real title/description, so the
 *      "fallback" is never empty even if nothing was ever configured
 *      in the CMS)
 * The same three-tier order applies to Open Graph metadata too, which
 * reuses `metaTitle`/`metaDescription` — see
 * src/services/admin/seo.service.ts's docstring for why there's no
 * separate OG-specific column in the schema.
 *
 * Read-only, no auth — mirrors src/lib/homepage-public-content.ts /
 * src/lib/static-page-public-content.ts's convention of a thin public
 * loader kept separate from the Admin CRUD service
 * (src/services/admin/seo.service.ts).
 */

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export type SeoLocale = "ar" | "en";

export interface ResolvedSeo {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl: string | null;
  noIndex: boolean;
}

interface SeoSettingRow {
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
}

async function readSeoRow(
  entityType: string,
  entityId: string | null,
  locale: SeoLocale
): Promise<SeoSettingRow | null> {
  if (entityId === null) {
    return prisma.seoSetting.findFirst({
      where: {
        entityType,
        entityId: null,
        locale,
      },
    });
  }

  return prisma.seoSetting.findUnique({
    where: {
      entityType_entityId_locale: {
        entityType,
        entityId,
        locale,
      },
    },
  });
}

/** The single global default keyword list (see SiteSettingsAdminService's
 * "seo" group) — read directly here rather than through the full
 * settings object, since only this one field is needed. */
async function readGlobalKeywords(): Promise<string[]> {
  const row = await prisma.siteSetting.findUnique({ where: { group_key: { group: "seo", key: "default_keywords" } } });
  if (!row?.value?.trim()) return [];
  return row.value
    .split(",")
    .map((k: string) => k.trim())
    .filter(Boolean);
}

/**
 * Resolves SEO for one entity, honoring the 3-tier order above.
 * `entityType: "global"` skips tier 1 (there's nothing more specific
 * than global itself).
 */
export async function resolveSeo(
  entityType: string,
  entityId: string | null,
  locale: SeoLocale,
  fallback: { title: string; description: string }
): Promise<ResolvedSeo> {
  const [specific, global, keywords] = await Promise.all([
    entityType === "global" ? null : readSeoRow(entityType, entityId, locale),
    readSeoRow("global", null, locale),
    readGlobalKeywords(),
  ]);

  return {
    title: specific?.metaTitle || global?.metaTitle || fallback.title,
    description: specific?.metaDescription || global?.metaDescription || fallback.description,
    keywords,
    canonicalUrl: specific?.canonicalUrl || global?.canonicalUrl || null,
    noIndex: specific?.noIndex ?? global?.noIndex ?? false,
  };
}

/** Converts a resolved SEO result into a Next.js `Metadata` object —
 * every page that calls `resolveSeo` should pass its result straight
 * through this, so title/description/canonical/robots/OG/Twitter are
 * always derived the same way everywhere. */
export function toMetadata(resolved: ResolvedSeo): Metadata {
  return {
    title: resolved.title,
    description: resolved.description,
    keywords: resolved.keywords.length > 0 ? resolved.keywords : undefined,
    alternates: resolved.canonicalUrl ? { canonical: resolved.canonicalUrl } : undefined,
    robots: resolved.noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: resolved.title,
      description: resolved.description,
      type: "website",
      locale: "ar_SA",
    },
    twitter: {
      card: "summary_large_image",
      title: resolved.title,
      description: resolved.description,
    },
  };
}
