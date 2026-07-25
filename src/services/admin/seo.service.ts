/**
 * SeoAdminService
 * ================
 * SEO CMS. Reuses the EXISTING `SeoSetting` model
 * (prisma/schema.prisma) — `(entityType, entityId, locale) ->
 * {metaTitle, metaDescription, canonicalUrl, noIndex, ogImageMediaId}`
 * — already designed to cover "homepage" | "category" | "request" |
 * "global" entity types, with `entityId: null` for global/homepage-
 * level rows. No new model, no migration.
 *
 * FIELD SCOPE (why some requested fields aren't here): the schema has
 * no separate Open Graph title/description columns, no keywords
 * column, and `ogImageMediaId` is a foreign key into `Media` (Media
 * Library is explicitly out of this task's scope). Rather than
 * changing the schema, this service:
 *   - reuses `metaTitle`/`metaDescription` as the Open Graph title/
 *     description too (a standard, well-established SEO fallback
 *     pattern — see src/lib/seo.ts's `resolveSeoMetadata`), and
 *   - leaves keywords and OG/Twitter images out of THIS model (a
 *     global default keyword list is instead handled by
 *     SiteSettingsAdminService's generic `SiteSetting` store, since
 *     keywords are inherently a single global, not per-entity, value
 *     for this platform's current pages).
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
}

export type UpdateSeoFields = Partial<SeoFields>;

const EMPTY_SEO: SeoFields = { metaTitle: "", metaDescription: "", canonicalUrl: "", noIndex: false };

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
    const rows = await prisma.seoSetting.findMany({ where: { entityType, entityId } });
    const ar = rows.find((r: { locale: string }) => r.locale === "ar");
    const en = rows.find((r: { locale: string }) => r.locale === "en");
    return {
      ar: ar
        ? {
            metaTitle: ar.metaTitle ?? "",
            metaDescription: ar.metaDescription ?? "",
            canonicalUrl: ar.canonicalUrl ?? "",
            noIndex: ar.noIndex,
          }
        : { ...EMPTY_SEO },
      en: en
        ? {
            metaTitle: en.metaTitle ?? "",
            metaDescription: en.metaDescription ?? "",
            canonicalUrl: en.canonicalUrl ?? "",
            noIndex: en.noIndex,
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

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const saved: { ar: SeoFields; en: SeoFields } = { ar: { ...EMPTY_SEO }, en: { ...EMPTY_SEO } };

      for (const locale of ["ar", "en"] as const) {
        const input = values[locale];
        const merged: SeoFields = {
          metaTitle: input.metaTitle?.trim() ?? "",
          metaDescription: input.metaDescription?.trim() ?? "",
          canonicalUrl: input.canonicalUrl?.trim() ?? "",
          noIndex: input.noIndex ?? false,
        };

        await tx.seoSetting.upsert({
          where: { entityType_entityId_locale: { entityType, entityId, locale } },
          create: {
            entityType,
            entityId,
            locale,
            metaTitle: merged.metaTitle || null,
            metaDescription: merged.metaDescription || null,
            canonicalUrl: merged.canonicalUrl || null,
            noIndex: merged.noIndex,
          },
          update: {
            metaTitle: merged.metaTitle || null,
            metaDescription: merged.metaDescription || null,
            canonicalUrl: merged.canonicalUrl || null,
            noIndex: merged.noIndex,
          },
        });

        saved[locale] = merged;
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
