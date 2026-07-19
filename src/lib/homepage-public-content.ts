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

const DEFAULT_LOCALE: Locale = "ar";

export interface PublicHomepageMainContent {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}

export async function getPublicHomepageMainContent(): Promise<PublicHomepageMainContent | null> {
  const row = await prisma.pageContent.findUnique({
    where: { page_section_locale: { page: "homepage", section: "hero", locale: DEFAULT_LOCALE } },
  });
  if (!row || !row.heading || !row.body || !row.ctaLabel || !row.ctaUrl) {
    return null;
  }
  return { heading: row.heading, body: row.body, ctaLabel: row.ctaLabel, ctaUrl: row.ctaUrl };
}

export interface PublicHomepageStat {
  value: number;
  label: string;
}

export async function getPublicHomepageStats(): Promise<PublicHomepageStat[]> {
  const stats = await prisma.homepageStat.findMany({
    where: { isActive: true },
    include: { translations: true },
    orderBy: { sortOrder: "asc" },
  });
  return stats.map((s: { value: number; translations: { locale: string; label: string }[] }) => ({
    value: s.value,
    label:
      s.translations.find((t: { locale: string; label: string }) => t.locale === DEFAULT_LOCALE)?.label ??
      s.translations[0]?.label ??
      "",
  }));
}

export interface PublicTrustBadge {
  label: string;
}

export async function getPublicHomepageTrustBadges(): Promise<PublicTrustBadge[]> {
  const badges = await prisma.trustBadge.findMany({
    where: { isActive: true },
    include: { translations: true },
    orderBy: { sortOrder: "asc" },
  });
  return badges.map((b: { translations: { locale: string; label: string }[] }) => ({
    label:
      b.translations.find((t: { locale: string; label: string }) => t.locale === DEFAULT_LOCALE)?.label ??
      b.translations[0]?.label ??
      "",
  }));
}
