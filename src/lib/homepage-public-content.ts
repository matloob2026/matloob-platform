/**
 * Read-only homepage content for the public marketing page
 * (src/app/(marketing)/page.tsx) — Checkpoint 02.
 *
 * Mirrors src/lib/request-form-options.ts: a thin, page-scoped data
 * loader (not a full service class) reading the SAME models the Admin
 * Homepage CMS screen manages (src/services/homepage-content.service.ts
 * — `HomepageAdminContentService`). Kept separate from that admin
 * service on purpose: this file has no auth requirement (it's read by
 * a public page) and always degrades to a safe default instead of
 * throwing, which is a different contract than the admin CRUD service.
 *
 * Every function here returns `null` / `[]` when nothing has been
 * saved in the CMS yet — the caller (the homepage) then falls back to
 * the exact original hardcoded content, so "the homepage must continue
 * looking and working exactly as it does now unless a dynamic content
 * change is made from the Admin CMS" holds by construction.
 */

import { prisma } from "@/lib/prisma";
import type { Locale } from "@/types/domain";
import { HERO_IMAGE_SLOTS, type HeroImageSlot } from "@/services/homepage-content.service";

const DEFAULT_LOCALE: Locale = "ar";

export interface PublicHomepageMainContent {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  /** Real, admin-selected images per collage slot (via the Media
   * Library) — a slot missing from this map means "keep the original
   * static stock photo for that slot" (see homepage-render.ts). */
  heroImages: Partial<Record<HeroImageSlot, string>>;
}

function parseHeroImageIds(extra: unknown): Partial<Record<HeroImageSlot, string>> {
  if (!extra || typeof extra !== "object" || Array.isArray(extra)) return {};
  const heroImages = (extra as Record<string, unknown>).heroImages;
  if (!heroImages || typeof heroImages !== "object" || Array.isArray(heroImages)) return {};
  const result: Partial<Record<HeroImageSlot, string>> = {};
  for (const slot of HERO_IMAGE_SLOTS) {
    const value = (heroImages as Record<string, unknown>)[slot];
    if (typeof value === "string" && value) result[slot] = value;
  }
  return result;
}

export async function getPublicHomepageMainContent(): Promise<PublicHomepageMainContent | null> {
  const row = await prisma.pageContent.findUnique({
    where: { page_section_locale: { page: "homepage", section: "hero", locale: DEFAULT_LOCALE } },
  });
  if (!row || !row.heading || !row.body || !row.ctaLabel || !row.ctaUrl) {
    return null;
  }

  const slotMediaIds = parseHeroImageIds(row.extra);
  const idsToResolve = Object.values(slotMediaIds).filter((id): id is string => Boolean(id));
  const mediaRows =
    idsToResolve.length > 0
      ? await prisma.media.findMany({ where: { id: { in: idsToResolve } }, select: { id: true, url: true } })
      : [];
  const urlById = new Map<string, string>(mediaRows.map((m: { id: string; url: string }) => [m.id, m.url]));

  const heroImages: Partial<Record<HeroImageSlot, string>> = {};
  for (const slot of HERO_IMAGE_SLOTS) {
    const mediaId = slotMediaIds[slot];
    const url = mediaId ? urlById.get(mediaId) : undefined;
    if (url) heroImages[slot] = url;
  }

  return {
    heading: row.heading,
    body: row.body,
    ctaLabel: row.ctaLabel,
    ctaUrl: row.ctaUrl,
    heroImages,
  };
}

export interface PublicHomepageStat {
  value: number;
  label: string;
  /** Real, admin-selected icon (via the Media Library) — null when no
   * icon has been set, so the caller can fall back to the original
   * hardcoded icon for that stat's label (see homepage-render.ts's
   * STAT_ICONS map). */
  iconUrl: string | null;
}

export async function getPublicHomepageStats(): Promise<PublicHomepageStat[]> {
  const stats = await prisma.homepageStat.findMany({
    where: { isActive: true },
    include: { translations: true, icon: { select: { url: true } } },
    orderBy: { sortOrder: "asc" },
  });
  return stats.map(
    (s: { value: number; translations: { locale: string; label: string }[]; icon: { url: string } | null }) => ({
      value: s.value,
      label:
        s.translations.find((t: { locale: string; label: string }) => t.locale === DEFAULT_LOCALE)?.label ??
        s.translations[0]?.label ??
        "",
      iconUrl: s.icon?.url ?? null,
    })
  );
}

export interface PublicTrustBadge {
  label: string;
  /** Real, admin-selected icon — null falls back to the original
   * hardcoded icon for that badge's label (see homepage-render.ts's
   * TRUST_BADGE_ICONS map). */
  iconUrl: string | null;
}

export async function getPublicHomepageTrustBadges(): Promise<PublicTrustBadge[]> {
  const badges = await prisma.trustBadge.findMany({
    where: { isActive: true },
    include: { translations: true, icon: { select: { url: true } } },
    orderBy: { sortOrder: "asc" },
  });
  return badges.map(
    (b: { translations: { locale: string; label: string }[]; icon: { url: string } | null }) => ({
      label:
        b.translations.find((t: { locale: string; label: string }) => t.locale === DEFAULT_LOCALE)?.label ??
        b.translations[0]?.label ??
        "",
      iconUrl: b.icon?.url ?? null,
    })
  );
}
