/**
 * HomepageContentService
 * =======================
 * This service is the single boundary between the database and every
 * component that renders homepage content (hero text, stats, trust
 * badges, footer statement, SEO tags, branding).
 *
 * RULE: No React component, layout, or page in src/app or
 * src/components may import Prisma directly to fetch homepage content.
 * They call `getHomepageConfig(locale)` from here and receive a fully
 * typed, already-localized `HomepageConfig` object
 * (see src/types/admin.ts).
 *
 * WHY: this is what makes "everything editable from the Admin
 * Dashboard" actually true in practice, not just in the schema. If a
 * component fetched PageContent directly, every future homepage field
 * would require a frontend code change to expose. Funneling everything
 * through one service means the Admin Dashboard can add a field to
 * `extra` (Json) and the homepage picks it up with zero component
 * changes, as long as this service maps it through.
 *
 * IMPLEMENTATION STATUS: interface + contract only (Phase 1 —
 * architecture). Wire up the actual Prisma queries in Phase 2.
 */

import type { Locale } from "@/types/domain";
import type { HomepageConfig } from "@/types/admin";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface HomepageContentService {
  getHomepageConfig(locale: Locale): Promise<HomepageConfig>;
}

/**
 * TODO (Phase 2): implement against Prisma.
 *
 * Sketch of the real implementation:
 *
 *   async getHomepageConfig(locale) {
 *     const [hero, howItWorks, cta, footerStatement, stats, badges, links, seo, branding] =
 *       await Promise.all([
 *         prisma.pageContent.findUnique({ where: { page_section_locale: { page: 'homepage', section: 'hero', locale } } }),
 *         prisma.pageContent.findUnique({ where: { page_section_locale: { page: 'homepage', section: 'how_it_works', locale } } }),
 *         prisma.pageContent.findUnique({ where: { page_section_locale: { page: 'homepage', section: 'cta', locale } } }),
 *         prisma.pageContent.findUnique({ where: { page_section_locale: { page: 'homepage', section: 'footer_statement', locale } } }),
 *         prisma.homepageStat.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, include: { translations: true, icon: true } }),
 *         prisma.trustBadge.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, include: { translations: true, icon: true } }),
 *         prisma.socialLink.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
 *         prisma.seoSetting.findUnique({ where: { entityType_entityId_locale: { entityType: 'homepage', entityId: null, locale } } }),
 *         getBrandingSettings(), // reads SiteSetting group="branding"
 *       ]);
 *
 *     return mapToHomepageConfig({ hero, howItWorks, cta, footerStatement, stats, badges, links, seo, branding });
 *   }
 *
 * This should be cached (see src/lib/cache.ts, not yet implemented) with
 * a short TTL + explicit invalidation on Admin Dashboard save, since the
 * homepage is read constantly but written rarely.
 */
export class PrismaHomepageContentService implements HomepageContentService {
  async getHomepageConfig(_locale: Locale): Promise<HomepageConfig> {
    throw new Error(
      "PrismaHomepageContentService.getHomepageConfig not yet implemented — Phase 1 is architecture only. See docstring above for the implementation plan."
    );
  }
}

/**
 * HomepageAdminContentService
 * ============================
 * CMS Checkpoint 02 — real, database-backed admin management for the
 * three homepage areas explicitly in scope:
 *   1. Homepage Main Content (headline/subtitle/CTA label/CTA url) —
 *      `PageContent` where page="homepage", section="hero" (see
 *      src/admin/README.md's table: "Homepage → Hero | PageContent
 *      (section: hero) | Headline, subtext, CTA label/url, ..."). Hero
 *      IMAGES and the rest of the Hero tab (float-card collage) are
 *      explicitly out of scope this checkpoint — only the text/CTA
 *      fields on this same row are touched here.
 *   2. Homepage Statistics — the existing `HomepageStat` /
 *      `HomepageStatTranslation` models.
 *   3. Homepage Trust Badges — the existing `TrustBadge` /
 *      `TrustBadgeTranslation` models.
 *
 * No new models, no duplicate services — this is intentionally a
 * second class in the SAME file as the pre-existing
 * `HomepageContentService`/`PrismaHomepageContentService` (which stay
 * untouched and still cover the larger, not-yet-in-scope
 * `getHomepageConfig` — SEO, branding, social links, footer statement,
 * how-it-works — none of which this checkpoint touches).
 *
 * Follows the exact conventions established by
 * src/services/admin/category.service.ts in Checkpoint 01:
 *   - a typed `HomepageServiceError` instead of string-matching thrown
 *     errors,
 *   - every mutation wrapped in `prisma.$transaction`, writing an
 *     `AdminAuditLog` row in the same transaction (before/after
 *     snapshots), skipped gracefully (with a console warning) when
 *     `actorId` doesn't resolve to a real `User` row yet — same
 *     Phase-2-mock-session limitation documented in
 *     category.service.ts,
 *   - `Prisma.TransactionClient` (type-only import) to type the
 *     `$transaction` interactive-callback parameter correctly,
 *   - JSON-safe, index-signature-carrying (`Record<string, ...>`)
 *     snapshot shapes for the same reason category.service.ts uses one
 *     for its own audit snapshots.
 */

const HOMEPAGE_LOCALES = ["ar", "en"] as const;

export class HomepageServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION_ERROR" | "CONFLICT"
  ) {
    super(message);
    this.name = "HomepageServiceError";
  }
}

export function homepageServiceErrorStatus(code: HomepageServiceError["code"]): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "VALIDATION_ERROR":
    default:
      return 400;
  }
}

async function actorExists(actorId: string): Promise<boolean> {
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { id: true } });
  return Boolean(actor);
}

function warnAuditSkipped(action: string, entityId: string, actorId: string): void {
  console.warn(
    `[AdminAuditLog] skipped for action=${action} entityId=${entityId} — ` +
      `actor "${actorId}" has no matching User row (Phase 2 mock admin session). ` +
      `Will resume once real admin accounts are wired up.`
  );
}

// ---------------------------------------------------------------------
// 1. Homepage Main Content (PageContent: page="homepage", section="hero")
// ---------------------------------------------------------------------

export interface HomepageMainContentItem {
  headingAr: string;
  headingEn: string;
  bodyAr: string;
  bodyEn: string;
  ctaLabelAr: string;
  ctaLabelEn: string;
  /** Single shared destination — not localized in the Admin form (see
   * CtaSection in the homepage's own PageContent rows for precedent:
   * the schema stores it per-locale, but this checkpoint exposes one
   * field and mirrors it onto both locale rows on save). */
  ctaUrl: string;
}

export interface HomepageMainContentInput {
  headingAr: string;
  headingEn: string;
  bodyAr: string;
  bodyEn: string;
  ctaLabelAr: string;
  ctaLabelEn: string;
  ctaUrl: string;
}

interface PageContentRow {
  heading: string | null;
  body: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  locale: string;
}

function validateMainContent(input: HomepageMainContentInput): void {
  if (!input.headingAr?.trim()) {
    throw new HomepageServiceError("العنوان الرئيسي بالعربية مطلوب.", "VALIDATION_ERROR");
  }
  if (!input.headingEn?.trim()) {
    throw new HomepageServiceError("العنوان الرئيسي بالإنجليزية مطلوب.", "VALIDATION_ERROR");
  }
  if (!input.bodyAr?.trim()) {
    throw new HomepageServiceError("الوصف بالعربية مطلوب.", "VALIDATION_ERROR");
  }
  if (!input.bodyEn?.trim()) {
    throw new HomepageServiceError("الوصف بالإنجليزية مطلوب.", "VALIDATION_ERROR");
  }
  if (!input.ctaLabelAr?.trim()) {
    throw new HomepageServiceError("نص الزر بالعربية مطلوب.", "VALIDATION_ERROR");
  }
  if (!input.ctaLabelEn?.trim()) {
    throw new HomepageServiceError("نص الزر بالإنجليزية مطلوب.", "VALIDATION_ERROR");
  }
  if (!input.ctaUrl?.trim()) {
    throw new HomepageServiceError("رابط الزر مطلوب.", "VALIDATION_ERROR");
  }
  // Only a relative in-app path or a full URL — never something that
  // could turn the homepage's primary CTA into an open redirect.
  const isRelative = input.ctaUrl.startsWith("/");
  const isAbsoluteHttp = /^https?:\/\//i.test(input.ctaUrl);
  if (!isRelative && !isAbsoluteHttp) {
    throw new HomepageServiceError(
      "رابط الزر يجب أن يبدأ بـ / أو يكون رابطاً كاملاً (http:// أو https://).",
      "VALIDATION_ERROR"
    );
  }
}

// ---------------------------------------------------------------------
// 2. Homepage Statistics (HomepageStat / HomepageStatTranslation)
// ---------------------------------------------------------------------

export interface HomepageStatListItem {
  id: string;
  key: string;
  value: number;
  labelAr: string;
  labelEn: string;
  isActive: boolean;
  sortOrder: number;
}

export interface HomepageStatInput {
  key: string;
  value: number;
  labelAr: string;
  labelEn: string;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateHomepageStatInput = Partial<HomepageStatInput>;

const STAT_KEY_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

interface StatTranslationRow {
  locale: string;
  label: string;
}

interface HomepageStatRecord {
  id: string;
  key: string;
  value: number;
  sortOrder: number;
  isActive: boolean;
  translations: StatTranslationRow[];
}

const STAT_INCLUDE = { translations: true };

function toStatListItem(stat: HomepageStatRecord): HomepageStatListItem {
  const ar = stat.translations.find((t: StatTranslationRow) => t.locale === "ar");
  const en = stat.translations.find((t: StatTranslationRow) => t.locale === "en");
  return {
    id: stat.id,
    key: stat.key,
    value: stat.value,
    labelAr: ar?.label ?? stat.translations[0]?.label ?? "",
    labelEn: en?.label ?? stat.translations[0]?.label ?? "",
    isActive: stat.isActive,
    sortOrder: stat.sortOrder,
  };
}

function validateStatInput(input: HomepageStatInput): void {
  if (!input.key || !STAT_KEY_PATTERN.test(input.key)) {
    throw new HomepageServiceError(
      "المفتاح (Key) مطلوب ويجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات سفلية فقط، مثل requests_published.",
      "VALIDATION_ERROR"
    );
  }
  if (!Number.isFinite(input.value) || input.value < 0) {
    throw new HomepageServiceError("القيمة يجب أن تكون رقماً موجباً.", "VALIDATION_ERROR");
  }
  if (!input.labelAr?.trim()) {
    throw new HomepageServiceError("التسمية بالعربية مطلوبة.", "VALIDATION_ERROR");
  }
  if (!input.labelEn?.trim()) {
    throw new HomepageServiceError("التسمية بالإنجليزية مطلوبة.", "VALIDATION_ERROR");
  }
}

// ---------------------------------------------------------------------
// 3. Homepage Trust Badges (TrustBadge / TrustBadgeTranslation)
// ---------------------------------------------------------------------

export interface TrustBadgeListItem {
  id: string;
  labelAr: string;
  labelEn: string;
  isActive: boolean;
  sortOrder: number;
}

export interface TrustBadgeInput {
  labelAr: string;
  labelEn: string;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateTrustBadgeInput = Partial<TrustBadgeInput>;

interface TrustBadgeRecord {
  id: string;
  sortOrder: number;
  isActive: boolean;
  translations: StatTranslationRow[];
}

const TRUST_BADGE_INCLUDE = { translations: true };

function toTrustBadgeListItem(badge: TrustBadgeRecord): TrustBadgeListItem {
  const ar = badge.translations.find((t: StatTranslationRow) => t.locale === "ar");
  const en = badge.translations.find((t: StatTranslationRow) => t.locale === "en");
  return {
    id: badge.id,
    labelAr: ar?.label ?? badge.translations[0]?.label ?? "",
    labelEn: en?.label ?? badge.translations[0]?.label ?? "",
    isActive: badge.isActive,
    sortOrder: badge.sortOrder,
  };
}

function validateTrustBadgeInput(input: TrustBadgeInput): void {
  if (!input.labelAr?.trim()) {
    throw new HomepageServiceError("نص الشارة بالعربية مطلوب.", "VALIDATION_ERROR");
  }
  if (!input.labelEn?.trim()) {
    throw new HomepageServiceError("نص الشارة بالإنجليزية مطلوب.", "VALIDATION_ERROR");
  }
}

// ---------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------

export class HomepageAdminContentService {
  // -- Main content ------------------------------------------------

  /** Reads both locale rows for (homepage, hero). Returns null if
   * neither has been saved yet — caller (the Admin form) then shows
   * its own safe defaults, matching the public page's fallback. */
  async getMainContent(): Promise<HomepageMainContentItem | null> {
    const rows = await prisma.pageContent.findMany({
      where: { page: "homepage", section: "hero", locale: { in: [...HOMEPAGE_LOCALES] } },
    });
    if (rows.length === 0) return null;

    const ar = rows.find((r: PageContentRow) => r.locale === "ar");
    const en = rows.find((r: PageContentRow) => r.locale === "en");
    return {
      headingAr: ar?.heading ?? "",
      headingEn: en?.heading ?? "",
      bodyAr: ar?.body ?? "",
      bodyEn: en?.body ?? "",
      ctaLabelAr: ar?.ctaLabel ?? "",
      ctaLabelEn: en?.ctaLabel ?? "",
      ctaUrl: ar?.ctaUrl ?? en?.ctaUrl ?? "",
    };
  }

  async saveMainContent(input: HomepageMainContentInput, actorId: string): Promise<HomepageMainContentItem> {
    validateMainContent(input);

    const before = await prisma.pageContent.findMany({
      where: { page: "homepage", section: "hero", locale: { in: [...HOMEPAGE_LOCALES] } },
    });
    const hasRealActor = await actorExists(actorId);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.pageContent.upsert({
        where: { page_section_locale: { page: "homepage", section: "hero", locale: "ar" } },
        create: {
          page: "homepage",
          section: "hero",
          locale: "ar",
          heading: input.headingAr,
          body: input.bodyAr,
          ctaLabel: input.ctaLabelAr,
          ctaUrl: input.ctaUrl,
        },
        update: {
          heading: input.headingAr,
          body: input.bodyAr,
          ctaLabel: input.ctaLabelAr,
          ctaUrl: input.ctaUrl,
        },
      });

      await tx.pageContent.upsert({
        where: { page_section_locale: { page: "homepage", section: "hero", locale: "en" } },
        create: {
          page: "homepage",
          section: "hero",
          locale: "en",
          heading: input.headingEn,
          body: input.bodyEn,
          ctaLabel: input.ctaLabelEn,
          ctaUrl: input.ctaUrl,
        },
        update: {
          heading: input.headingEn,
          body: input.bodyEn,
          ctaLabel: input.ctaLabelEn,
          ctaUrl: input.ctaUrl,
        },
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "UPDATE_HOMEPAGE_MAIN_CONTENT",
            entityType: "PageContent",
            entityId: "homepage:hero",
            before: toPageContentSnapshot(before),
            after: {
              headingAr: input.headingAr,
              headingEn: input.headingEn,
              bodyAr: input.bodyAr,
              bodyEn: input.bodyEn,
              ctaLabelAr: input.ctaLabelAr,
              ctaLabelEn: input.ctaLabelEn,
              ctaUrl: input.ctaUrl,
            },
          },
        });
      } else {
        warnAuditSkipped("UPDATE_HOMEPAGE_MAIN_CONTENT", "homepage:hero", actorId);
      }
    });

    const saved = await this.getMainContent();
    if (!saved) {
      throw new HomepageServiceError("تعذر حفظ محتوى الصفحة الرئيسية.", "CONFLICT");
    }
    return saved;
  }

  // -- Statistics ----------------------------------------------------

  async listStats(): Promise<HomepageStatListItem[]> {
    const stats = await prisma.homepageStat.findMany({
      include: STAT_INCLUDE,
      orderBy: [{ sortOrder: "asc" }],
    });
    return stats.map((s: HomepageStatRecord) => toStatListItem(s));
  }

  async createStat(input: HomepageStatInput, actorId: string): Promise<HomepageStatListItem> {
    validateStatInput(input);

    const existing = await prisma.homepageStat.findUnique({ where: { key: input.key } });
    if (existing) {
      throw new HomepageServiceError(`المفتاح "${input.key}" مستخدم بالفعل لإحصائية أخرى.`, "CONFLICT");
    }

    const hasRealActor = await actorExists(actorId);

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const stat = await tx.homepageStat.create({
        data: {
          key: input.key,
          value: input.value,
          isActive: input.isActive ?? true,
          sortOrder: input.sortOrder ?? 0,
          translations: {
            create: [
              { locale: "ar", label: input.labelAr },
              { locale: "en", label: input.labelEn },
            ],
          },
        },
        include: STAT_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "CREATE_HOMEPAGE_STAT",
            entityType: "HomepageStat",
            entityId: stat.id,
            before: undefined,
            after: { key: stat.key, value: stat.value, labelAr: input.labelAr, labelEn: input.labelEn },
          },
        });
      } else {
        warnAuditSkipped("CREATE_HOMEPAGE_STAT", stat.id, actorId);
      }

      return stat;
    });

    return toStatListItem(created);
  }

  async updateStat(id: string, input: UpdateHomepageStatInput, actorId: string): Promise<HomepageStatListItem> {
    const before = await prisma.homepageStat.findUnique({ where: { id }, include: STAT_INCLUDE });
    if (!before) {
      throw new HomepageServiceError("الإحصائية غير موجودة.", "NOT_FOUND");
    }

    const merged: HomepageStatInput = {
      key: input.key ?? before.key,
      value: input.value ?? before.value,
      labelAr: input.labelAr ?? before.translations.find((t: StatTranslationRow) => t.locale === "ar")?.label ?? "",
      labelEn: input.labelEn ?? before.translations.find((t: StatTranslationRow) => t.locale === "en")?.label ?? "",
      isActive: input.isActive ?? before.isActive,
      sortOrder: input.sortOrder ?? before.sortOrder,
    };
    validateStatInput(merged);

    if (merged.key !== before.key) {
      const keyTaken = await prisma.homepageStat.findUnique({ where: { key: merged.key } });
      if (keyTaken) {
        throw new HomepageServiceError(`المفتاح "${merged.key}" مستخدم بالفعل لإحصائية أخرى.`, "CONFLICT");
      }
    }

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const stat = await tx.homepageStat.update({
        where: { id },
        data: {
          key: merged.key,
          value: merged.value,
          isActive: merged.isActive,
          sortOrder: merged.sortOrder,
          translations: {
            upsert: [
              {
                where: { statId_locale: { statId: id, locale: "ar" } },
                create: { locale: "ar", label: merged.labelAr },
                update: { label: merged.labelAr },
              },
              {
                where: { statId_locale: { statId: id, locale: "en" } },
                create: { locale: "en", label: merged.labelEn },
                update: { label: merged.labelEn },
              },
            ],
          },
        },
        include: STAT_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "UPDATE_HOMEPAGE_STAT",
            entityType: "HomepageStat",
            entityId: id,
            before: toStatSnapshot(before),
            after: toStatSnapshot(stat),
          },
        });
      } else {
        warnAuditSkipped("UPDATE_HOMEPAGE_STAT", id, actorId);
      }

      return stat;
    });

    return toStatListItem(updated);
  }

  async setStatActive(id: string, isActive: boolean, actorId: string): Promise<HomepageStatListItem> {
    const before = await prisma.homepageStat.findUnique({ where: { id }, include: STAT_INCLUDE });
    if (!before) {
      throw new HomepageServiceError("الإحصائية غير موجودة.", "NOT_FOUND");
    }

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const stat = await tx.homepageStat.update({ where: { id }, data: { isActive }, include: STAT_INCLUDE });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: isActive ? "ACTIVATE_HOMEPAGE_STAT" : "DEACTIVATE_HOMEPAGE_STAT",
            entityType: "HomepageStat",
            entityId: id,
            before: { isActive: before.isActive },
            after: { isActive: stat.isActive },
          },
        });
      } else {
        warnAuditSkipped(isActive ? "ACTIVATE_HOMEPAGE_STAT" : "DEACTIVATE_HOMEPAGE_STAT", id, actorId);
      }

      return stat;
    });

    return toStatListItem(updated);
  }

  /** Nothing else in the schema references HomepageStat by foreign
   * key, so deleting one is always safe — still gated behind the
   * same permission + audit-log pattern as every other mutation here. */
  async deleteStat(id: string, actorId: string): Promise<void> {
    const stat = await prisma.homepageStat.findUnique({ where: { id }, include: STAT_INCLUDE });
    if (!stat) {
      throw new HomepageServiceError("الإحصائية غير موجودة.", "NOT_FOUND");
    }

    const hasRealActor = await actorExists(actorId);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.homepageStat.delete({ where: { id } });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "DELETE_HOMEPAGE_STAT",
            entityType: "HomepageStat",
            entityId: id,
            before: toStatSnapshot(stat),
            after: undefined,
          },
        });
      } else {
        warnAuditSkipped("DELETE_HOMEPAGE_STAT", id, actorId);
      }
    });
  }

  // -- Trust badges ----------------------------------------------------

  async listTrustBadges(): Promise<TrustBadgeListItem[]> {
    const badges = await prisma.trustBadge.findMany({
      include: TRUST_BADGE_INCLUDE,
      orderBy: [{ sortOrder: "asc" }],
    });
    return badges.map((b: TrustBadgeRecord) => toTrustBadgeListItem(b));
  }

  async createTrustBadge(input: TrustBadgeInput, actorId: string): Promise<TrustBadgeListItem> {
    validateTrustBadgeInput(input);

    const hasRealActor = await actorExists(actorId);

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const badge = await tx.trustBadge.create({
        data: {
          isActive: input.isActive ?? true,
          sortOrder: input.sortOrder ?? 0,
          translations: {
            create: [
              { locale: "ar", label: input.labelAr },
              { locale: "en", label: input.labelEn },
            ],
          },
        },
        include: TRUST_BADGE_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "CREATE_TRUST_BADGE",
            entityType: "TrustBadge",
            entityId: badge.id,
            before: undefined,
            after: { labelAr: input.labelAr, labelEn: input.labelEn, isActive: badge.isActive },
          },
        });
      } else {
        warnAuditSkipped("CREATE_TRUST_BADGE", badge.id, actorId);
      }

      return badge;
    });

    return toTrustBadgeListItem(created);
  }

  async updateTrustBadge(
    id: string,
    input: UpdateTrustBadgeInput,
    actorId: string
  ): Promise<TrustBadgeListItem> {
    const before = await prisma.trustBadge.findUnique({ where: { id }, include: TRUST_BADGE_INCLUDE });
    if (!before) {
      throw new HomepageServiceError("الشارة غير موجودة.", "NOT_FOUND");
    }

    const merged: TrustBadgeInput = {
      labelAr: input.labelAr ?? before.translations.find((t: StatTranslationRow) => t.locale === "ar")?.label ?? "",
      labelEn: input.labelEn ?? before.translations.find((t: StatTranslationRow) => t.locale === "en")?.label ?? "",
      isActive: input.isActive ?? before.isActive,
      sortOrder: input.sortOrder ?? before.sortOrder,
    };
    validateTrustBadgeInput(merged);

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const badge = await tx.trustBadge.update({
        where: { id },
        data: {
          isActive: merged.isActive,
          sortOrder: merged.sortOrder,
          translations: {
            upsert: [
              {
                where: { badgeId_locale: { badgeId: id, locale: "ar" } },
                create: { locale: "ar", label: merged.labelAr },
                update: { label: merged.labelAr },
              },
              {
                where: { badgeId_locale: { badgeId: id, locale: "en" } },
                create: { locale: "en", label: merged.labelEn },
                update: { label: merged.labelEn },
              },
            ],
          },
        },
        include: TRUST_BADGE_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "UPDATE_TRUST_BADGE",
            entityType: "TrustBadge",
            entityId: id,
            before: toTrustBadgeSnapshot(before),
            after: toTrustBadgeSnapshot(badge),
          },
        });
      } else {
        warnAuditSkipped("UPDATE_TRUST_BADGE", id, actorId);
      }

      return badge;
    });

    return toTrustBadgeListItem(updated);
  }

  async setTrustBadgeActive(id: string, isActive: boolean, actorId: string): Promise<TrustBadgeListItem> {
    const before = await prisma.trustBadge.findUnique({ where: { id }, include: TRUST_BADGE_INCLUDE });
    if (!before) {
      throw new HomepageServiceError("الشارة غير موجودة.", "NOT_FOUND");
    }

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const badge = await tx.trustBadge.update({ where: { id }, data: { isActive }, include: TRUST_BADGE_INCLUDE });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: isActive ? "ACTIVATE_TRUST_BADGE" : "DEACTIVATE_TRUST_BADGE",
            entityType: "TrustBadge",
            entityId: id,
            before: { isActive: before.isActive },
            after: { isActive: badge.isActive },
          },
        });
      } else {
        warnAuditSkipped(isActive ? "ACTIVATE_TRUST_BADGE" : "DEACTIVATE_TRUST_BADGE", id, actorId);
      }

      return badge;
    });

    return toTrustBadgeListItem(updated);
  }

  /** Nothing else references TrustBadge by foreign key either — always
   * safe to delete, same permission + audit-log gating as the rest. */
  async deleteTrustBadge(id: string, actorId: string): Promise<void> {
    const badge = await prisma.trustBadge.findUnique({ where: { id }, include: TRUST_BADGE_INCLUDE });
    if (!badge) {
      throw new HomepageServiceError("الشارة غير موجودة.", "NOT_FOUND");
    }

    const hasRealActor = await actorExists(actorId);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.trustBadge.delete({ where: { id } });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "DELETE_TRUST_BADGE",
            entityType: "TrustBadge",
            entityId: id,
            before: toTrustBadgeSnapshot(badge),
            after: undefined,
          },
        });
      } else {
        warnAuditSkipped("DELETE_TRUST_BADGE", id, actorId);
      }
    });
  }
}

function toPageContentSnapshot(rows: PageContentRow[]): Record<string, string | number | boolean | null> {
  const ar = rows.find((r) => r.locale === "ar");
  const en = rows.find((r) => r.locale === "en");
  return {
    headingAr: ar?.heading ?? null,
    headingEn: en?.heading ?? null,
    bodyAr: ar?.body ?? null,
    bodyEn: en?.body ?? null,
    ctaLabelAr: ar?.ctaLabel ?? null,
    ctaLabelEn: en?.ctaLabel ?? null,
    ctaUrl: ar?.ctaUrl ?? en?.ctaUrl ?? null,
  };
}

function toStatSnapshot(stat: HomepageStatRecord): Record<string, string | number | boolean | null> {
  return {
    key: stat.key,
    value: stat.value,
    isActive: stat.isActive,
    sortOrder: stat.sortOrder,
    labelAr: stat.translations.find((t: StatTranslationRow) => t.locale === "ar")?.label ?? null,
    labelEn: stat.translations.find((t: StatTranslationRow) => t.locale === "en")?.label ?? null,
  };
}

function toTrustBadgeSnapshot(badge: TrustBadgeRecord): Record<string, string | number | boolean | null> {
  return {
    isActive: badge.isActive,
    sortOrder: badge.sortOrder,
    labelAr: badge.translations.find((t: StatTranslationRow) => t.locale === "ar")?.label ?? null,
    labelEn: badge.translations.find((t: StatTranslationRow) => t.locale === "en")?.label ?? null,
  };
}

export const homepageAdminContentService = new HomepageAdminContentService();
