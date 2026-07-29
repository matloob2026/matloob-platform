/**
 * SeoAdminService
 * ================
 * SEO CMS. Reuses the EXISTING `SeoSetting` model
 * (prisma/schema.prisma) — `(entityType, entityId, locale) ->
 * {metaTitle, metaDescription, canonicalUrl, noIndex, ogImageMediaId}`
 * — already designed to cover "homepage" | "category" | "request" |
 * "global" entity types, with `entityId: null` meaning global/
 * homepage-level rows from every caller's point of view (this
 * service's own callers, and src/lib/seo.ts's `resolveSeo`). See
 * `normalizeEntityId` below for the one storage-level detail this
 * implies. No new model, no migration.
 *
 * FIELD SCOPE (why some requested fields still aren't here): the
 * schema has no separate Open Graph title/description columns and no
 * keywords column. Rather than changing the schema, this service:
 *   - reuses `metaTitle`/`metaDescription` as the Open Graph title/
 *     description too (a standard, well-established SEO fallback
 *     pattern — see src/lib/seo.ts's `resolveSeoMetadata`),
 *   - reuses `ogImageMediaId` (a `Media` foreign key already in the
 *     schema) as the Open Graph AND Twitter/X card image, resolved via
 *     the Media Library integration (`<MediaPicker>` — see
 *     `SeoFields.ogImage` below; previously left unwired before the
 *     Media Library existed to pick from), and
 *   - leaves keywords out of THIS model (a global default keyword
 *     list is instead handled by SiteSettingsAdminService's generic
 *     `SiteSetting` store, since keywords are inherently a single
 *     global, not per-entity, value for this platform's current
 *     pages).
 * This keeps the schema untouched while still satisfying every field
 * this task marks "if supported"/"where supported".
 *
 * Follows the exact conventions established in
 * src/services/admin/category.service.ts.
 *
 * VERIFICATION NOTE: same sandbox limitation documented in
 * category.service.ts.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type SeoLocale = "ar" | "en";

export interface SeoFields {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  noIndex: boolean;
  /** Media Library integration — reuses `SeoSetting.ogImageMediaId`
   * (already in the schema; previously left unwired because no Media
   * Library existed to pick from — see the file docstring's original
   * "FIELD SCOPE" note). Also doubles as the Twitter/X card image per
   * the same Open-Graph-as-Twitter-fallback convention already used
   * for metaTitle/metaDescription. */
  ogImage: { id: string; url: string } | null;
}

export type UpdateSeoFields = Partial<Omit<SeoFields, "ogImage">> & { ogImageMediaId?: string | null };

const EMPTY_SEO: SeoFields = { metaTitle: "", metaDescription: "", canonicalUrl: "", noIndex: false, ogImage: null };

/** Flat, JSON-safe shape for the audit log — a plain
 * `{ar: SeoFields, en: SeoFields}` interface has no string index
 * signature and isn't assignable to Prisma's generated `Json` input
 * type (the exact issue already hit and fixed in
 * category.service.ts's audit snapshots), so this flattens both
 * locales into one `Record<string, string | number | boolean | null>`
 * instead. */
function toSeoAuditSnapshot(saved: { ar: SeoFields; en: SeoFields }): Record<string, string | number | boolean | null> {
  return {
    arMetaTitle: saved.ar.metaTitle || null,
    arMetaDescription: saved.ar.metaDescription || null,
    arCanonicalUrl: saved.ar.canonicalUrl || null,
    arNoIndex: saved.ar.noIndex,
    enMetaTitle: saved.en.metaTitle || null,
    enMetaDescription: saved.en.metaDescription || null,
    enCanonicalUrl: saved.en.canonicalUrl || null,
    enNoIndex: saved.en.noIndex,
  };
}

async function actorExists(actorId: string): Promise<boolean> {
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { id: true } });
  return Boolean(actor);
}

/**
 * Prisma requires a real (non-null) string for every field inside a
 * compound `@@unique` constraint's lookup key — `SeoSetting.entityId`
 * is `String?` in the schema (nullable, exactly so "no specific
 * entity" / global rows can exist), but `findUnique`/`upsert`'s
 * compound-key input type does not accept `null` there. This is not a
 * type-safety workaround: a compound unique index with a NULL
 * component isn't a valid equality lookup key in SQL either (NULL is
 * never equal to NULL), so Prisma's generated types correctly
 * disallow it — the fix has to be a real, non-null sentinel value,
 * used consistently on both the read and write side.
 *
 * Every "global"/no-specific-entity row is therefore actually stored
 * with `entityId: ""`, never a real SQL NULL — matching the identical
 * fix in src/lib/seo.ts's `normalizeEntityId`. Every method below that
 * touches `entityId` (`getSeo`, `saveSeo`) normalizes through this
 * same function, so a row written by one always matches what the
 * other reads. The public methods still accept `entityId: string |
 * null` — `null` still means "global" to every caller (both this
 * service's own callers and src/lib/seo.ts's `resolveSeo`) — this
 * normalization is purely an internal storage detail.
 */
function normalizeEntityId(entityId: string | null): string {
  return entityId ?? "";
}

function warnAuditSkipped(action: string, entityId: string, actorId: string): void {
  console.warn(
    `[AdminAuditLog] skipped for action=${action} entityId=${entityId} — ` +
      `actor "${actorId}" has no matching User row (Phase 2 mock admin session). ` +
      `Will resume once real admin accounts are wired up.`
  );
}

export class SeoAdminService {
  /** Reads the (ar, en) pair for one entity — used by the Admin form
   * to pre-fill. */
  async getSeo(entityType: string, entityId: string | null): Promise<{ ar: SeoFields; en: SeoFields }> {
    const rows = await prisma.seoSetting.findMany({
      where: { entityType, entityId: normalizeEntityId(entityId) },
      include: { ogImage: { select: { id: true, url: true } } },
    });
    const ar = rows.find((r: { locale: string }) => r.locale === "ar");
    const en = rows.find((r: { locale: string }) => r.locale === "en");
    return {
      ar: ar
        ? {
            metaTitle: ar.metaTitle ?? "",
            metaDescription: ar.metaDescription ?? "",
            canonicalUrl: ar.canonicalUrl ?? "",
            noIndex: ar.noIndex,
            ogImage: ar.ogImage,
          }
        : { ...EMPTY_SEO },
      en: en
        ? {
            metaTitle: en.metaTitle ?? "",
            metaDescription: en.metaDescription ?? "",
            canonicalUrl: en.canonicalUrl ?? "",
            noIndex: en.noIndex,
            ogImage: en.ogImage,
          }
        : { ...EMPTY_SEO },
    };
  }

  /** Saves both locale rows for one entity in a single call — leaving
   * a locale's fields blank simply stores empty values for it (never
   * throws), since every SEO field here is optional per this task's
   * "leaving it blank should not break the public website" rule. */
  async saveSeo(
    entityType: string,
    entityId: string | null,
    values: { ar: UpdateSeoFields; en: UpdateSeoFields },
    actorId: string
  ): Promise<{ ar: SeoFields; en: SeoFields }> {
    const hasRealActor = await actorExists(actorId);
    const normalizedEntityId = normalizeEntityId(entityId);

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const saved: { ar: SeoFields; en: SeoFields } = { ar: { ...EMPTY_SEO }, en: { ...EMPTY_SEO } };

      for (const locale of ["ar", "en"] as const) {
        const input = values[locale];
        const merged = {
          metaTitle: input.metaTitle?.trim() ?? "",
          metaDescription: input.metaDescription?.trim() ?? "",
          canonicalUrl: input.canonicalUrl?.trim() ?? "",
          noIndex: input.noIndex ?? false,
          ogImageMediaId: input.ogImageMediaId ?? null,
        };

        const row = await tx.seoSetting.upsert({
          where: { entityType_entityId_locale: { entityType, entityId: normalizedEntityId, locale } },
          create: {
            entityType,
            entityId: normalizedEntityId,
            locale,
            metaTitle: merged.metaTitle || null,
            metaDescription: merged.metaDescription || null,
            canonicalUrl: merged.canonicalUrl || null,
            noIndex: merged.noIndex,
            ogImageMediaId: merged.ogImageMediaId,
          },
          update: {
            metaTitle: merged.metaTitle || null,
            metaDescription: merged.metaDescription || null,
            canonicalUrl: merged.canonicalUrl || null,
            noIndex: merged.noIndex,
            ogImageMediaId: merged.ogImageMediaId,
          },
          include: { ogImage: { select: { id: true, url: true } } },
        });

        saved[locale] = {
          metaTitle: merged.metaTitle,
          metaDescription: merged.metaDescription,
          canonicalUrl: merged.canonicalUrl,
          noIndex: merged.noIndex,
          ogImage: row.ogImage,
        };
      }

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "UPDATE_SEO_SETTING",
            entityType: "SeoSetting",
            entityId: `${entityType}:${entityId ?? "global"}`,
            before: undefined,
            after: toSeoAuditSnapshot(saved),
          },
        });
      } else {
        warnAuditSkipped("UPDATE_SEO_SETTING", `${entityType}:${entityId ?? "global"}`, actorId);
      }

      return saved;
    });

    return result;
  }
}

export const seoAdminService = new SeoAdminService();
