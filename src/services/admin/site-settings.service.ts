/**
 * SiteSettingsAdminService
 * =========================
 * Global Site Settings CMS. Reuses the EXISTING `SiteSetting` model
 * (prisma/schema.prisma) — a generic `(group, key) -> value` store
 * already designed for exactly this ("branding" | "footer" | "hero" |
 * "seo" | ..., e.g. "logo_url" | "primary_color" | "contact_email").
 * No new model, no migration.
 *
 * Every logical setting this task asks for (brand/identity, contact
 * info, social links, public-site behavior) is one row:
 * `group` identifies the section, `key` the field, `value` the raw
 * string (parsed per `valueType` — STRING/BOOLEAN/IMAGE_URL here).
 * Logo/favicon are stored as plain `IMAGE_URL` strings (the schema's
 * own `SettingValueType` enum already has this exact variant for
 * "an image referenced by URL, not by a Media row") — this
 * deliberately avoids touching the Media Library, which is out of
 * this task's scope.
 *
 * Follows the exact conventions established in
 * src/services/admin/category.service.ts (typed *ServiceError class,
 * type-only `Prisma.TransactionClient` import, `undefined` not `null`
 * for empty Json audit fields, actor-exists-gated AdminAuditLog rows).
 *
 * VERIFICATION NOTE: same sandbox limitation documented in
 * category.service.ts — `prisma generate` cannot complete here
 * because the network proxy blocks binaries.prisma.sh.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export class SiteSettingsServiceError extends Error {
  constructor(message: string, public readonly code: "VALIDATION_ERROR") {
    super(message);
    this.name = "SiteSettingsServiceError";
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
// Field catalog — the ONLY settings this CMS exposes (deliberately not
// dozens of speculative options — see this task's own instruction).
// Each entry's key is the SiteSetting.key within its group.
// ---------------------------------------------------------------------

export interface BrandSettings {
  siteNameAr: string;
  siteNameEn: string;
  taglineAr: string;
  taglineEn: string;
  logoUrl: string;
  faviconUrl: string;
  defaultLocale: "ar" | "en";
}

export interface ContactSettings {
  contactEmail: string;
  supportEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  address: string;
}

export interface SocialSettings {
  facebook: string;
  instagram: string;
  tiktok: string;
  x: string;
  linkedin: string;
  youtube: string;
}

export interface BehaviorSettings {
  maintenanceMode: boolean;
  defaultPageSize: number;
}

/** Global SEO values that aren't per-entity (unlike SeoSetting rows) —
 * a single default keyword list, and the two technical-SEO overrides
 * (custom robots.txt body, custom schema.org JSON-LD) that
 * src/app/robots.ts / the homepage's structured data read. All three
 * fit the existing generic SiteSetting store cleanly, avoiding a
 * dedicated SEO-settings model for what is fundamentally global,
 * singular configuration. */
export interface SeoGlobalSettings {
  defaultKeywords: string;
  robotsTxtCustom: string;
  schemaJsonLd: string;
}

/** Administration module addition. `sessionTimeoutHours` is read by
 * src/auth/tokens.ts's admin session generator (falls back to the
 * previous fixed 8h if unset) — the one genuinely safe,
 * admin-facing "security" knob to expose without touching the
 * end-user-facing password/registration validation rules
 * (`MIN_PASSWORD_LENGTH` in src/auth/password.ts), which stay
 * code-level constants since they affect the whole user base, not
 * just admin accounts. */
export interface SecuritySettings {
  sessionTimeoutHours: number;
}

/** Administration module addition — company/legal details distinct
 * from `ContactSettings` (which is about how visitors REACH the
 * business) and `BrandSettings` (public-facing name/tagline). Purely
 * informational; nothing in the codebase currently reads these back
 * out, so leaving them blank never breaks anything. */
export interface CompanySettings {
  legalName: string;
  registrationNumber: string;
  taxNumber: string;
}

export interface AllSiteSettings {
  brand: BrandSettings;
  contact: ContactSettings;
  social: SocialSettings;
  behavior: BehaviorSettings;
  seo: SeoGlobalSettings;
  security: SecuritySettings;
  company: CompanySettings;
}

const DEFAULTS: AllSiteSettings = {
  brand: {
    siteNameAr: "مطلوب",
    siteNameEn: "Matloob",
    taglineAr: "بدل ما تدور... اطلبها",
    taglineEn: "Request it instead of searching",
    logoUrl: "",
    faviconUrl: "",
    defaultLocale: "ar",
  },
  contact: { contactEmail: "", supportEmail: "", contactPhone: "", whatsappNumber: "", address: "" },
  social: { facebook: "", instagram: "", tiktok: "", x: "", linkedin: "", youtube: "" },
  behavior: { maintenanceMode: false, defaultPageSize: 20 },
  seo: { defaultKeywords: "", robotsTxtCustom: "", schemaJsonLd: "" },
  security: { sessionTimeoutHours: 8 },
  company: { legalName: "", registrationNumber: "", taxNumber: "" },
};

interface FieldDef<T> {
  key: keyof T;
  settingKey: string;
  valueType: "STRING" | "BOOLEAN" | "NUMBER" | "IMAGE_URL";
}

/** Type-erased view of `FieldDef<T>` for the heterogeneous `GROUPS`
 * array below (each group's fields are typed against a different T).
 * A `FieldDef<T>[]` is always structurally assignable here since
 * `keyof T` is always a `string`. */
interface ErasedFieldDef {
  key: string;
  settingKey: string;
  valueType: "STRING" | "BOOLEAN" | "NUMBER" | "IMAGE_URL";
}

const BRAND_FIELDS: FieldDef<BrandSettings>[] = [
  { key: "siteNameAr", settingKey: "site_name_ar", valueType: "STRING" },
  { key: "siteNameEn", settingKey: "site_name_en", valueType: "STRING" },
  { key: "taglineAr", settingKey: "tagline_ar", valueType: "STRING" },
  { key: "taglineEn", settingKey: "tagline_en", valueType: "STRING" },
  { key: "logoUrl", settingKey: "logo_url", valueType: "IMAGE_URL" },
  { key: "faviconUrl", settingKey: "favicon_url", valueType: "IMAGE_URL" },
  { key: "defaultLocale", settingKey: "default_locale", valueType: "STRING" },
];

const CONTACT_FIELDS: FieldDef<ContactSettings>[] = [
  { key: "contactEmail", settingKey: "contact_email", valueType: "STRING" },
  { key: "supportEmail", settingKey: "support_email", valueType: "STRING" },
  { key: "contactPhone", settingKey: "contact_phone", valueType: "STRING" },
  { key: "whatsappNumber", settingKey: "whatsapp_number", valueType: "STRING" },
  { key: "address", settingKey: "address", valueType: "STRING" },
];

const SOCIAL_FIELDS: FieldDef<SocialSettings>[] = [
  { key: "facebook", settingKey: "facebook", valueType: "STRING" },
  { key: "instagram", settingKey: "instagram", valueType: "STRING" },
  { key: "tiktok", settingKey: "tiktok", valueType: "STRING" },
  { key: "x", settingKey: "x", valueType: "STRING" },
  { key: "linkedin", settingKey: "linkedin", valueType: "STRING" },
  { key: "youtube", settingKey: "youtube", valueType: "STRING" },
];

const BEHAVIOR_FIELDS: FieldDef<BehaviorSettings>[] = [
  { key: "maintenanceMode", settingKey: "maintenance_mode", valueType: "BOOLEAN" },
  { key: "defaultPageSize", settingKey: "default_page_size", valueType: "NUMBER" },
];

const SEO_GLOBAL_FIELDS: FieldDef<SeoGlobalSettings>[] = [
  { key: "defaultKeywords", settingKey: "default_keywords", valueType: "STRING" },
  { key: "robotsTxtCustom", settingKey: "robots_txt_custom", valueType: "STRING" },
  { key: "schemaJsonLd", settingKey: "schema_json_ld", valueType: "STRING" },
];

const SECURITY_FIELDS: FieldDef<SecuritySettings>[] = [
  { key: "sessionTimeoutHours", settingKey: "session_timeout_hours", valueType: "NUMBER" },
];

const COMPANY_FIELDS: FieldDef<CompanySettings>[] = [
  { key: "legalName", settingKey: "legal_name", valueType: "STRING" },
  { key: "registrationNumber", settingKey: "registration_number", valueType: "STRING" },
  { key: "taxNumber", settingKey: "tax_number", valueType: "STRING" },
];

const GROUPS: { group: keyof AllSiteSettings; fields: ErasedFieldDef[] }[] = [
  { group: "brand", fields: BRAND_FIELDS },
  { group: "contact", fields: CONTACT_FIELDS },
  { group: "social", fields: SOCIAL_FIELDS },
  { group: "behavior", fields: BEHAVIOR_FIELDS },
  { group: "seo", fields: SEO_GLOBAL_FIELDS },
  { group: "security", fields: SECURITY_FIELDS },
  { group: "company", fields: COMPANY_FIELDS },
];

function parseValue(raw: string, valueType: ErasedFieldDef["valueType"]): unknown {
  if (valueType === "BOOLEAN") return raw === "true";
  if (valueType === "NUMBER") return Number(raw) || 0;
  return raw;
}

function serializeValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value ?? "");
}

export class SiteSettingsAdminService {
  /** Reads every managed setting, filling in safe defaults for
   * anything never saved yet — the Admin form and the public site
   * both always get a complete, well-typed object. */
  async getAllSettings(): Promise<AllSiteSettings> {
    const rows: { group: string; key: string; value: string }[] = await prisma.siteSetting.findMany({
      where: { group: { in: GROUPS.map((g) => g.group) } },
    });
    const byGroupKey = new Map<string, string>();
    for (const row of rows) {
      byGroupKey.set(`${row.group}:${row.key}`, row.value);
    }

    const result: Record<string, Record<string, unknown>> = {
      brand: { ...DEFAULTS.brand },
      contact: { ...DEFAULTS.contact },
      social: { ...DEFAULTS.social },
      behavior: { ...DEFAULTS.behavior },
      seo: { ...DEFAULTS.seo },
    };

    for (const { group, fields } of GROUPS) {
      for (const field of fields) {
        const raw = byGroupKey.get(`${group}:${field.settingKey}`);
        if (raw !== undefined) {
          result[group]![field.key] = parseValue(raw, field.valueType);
        }
      }
    }

    return result as unknown as AllSiteSettings;
  }

  /** Saves one settings group (brand/contact/social/behavior) as a
   * single unit — upserts each field's row, only touching that
   * group's keys, never blindly overwriting the other groups. */
  async saveGroup<G extends keyof AllSiteSettings>(
    group: G,
    values: AllSiteSettings[G],
    actorId: string
  ): Promise<AllSiteSettings[G]> {
    const groupDef = GROUPS.find((g) => g.group === group);
    if (!groupDef) {
      throw new SiteSettingsServiceError(`مجموعة إعدادات غير معروفة: ${String(group)}`, "VALIDATION_ERROR");
    }

    if (group === "brand") {
      const brand = values as unknown as BrandSettings;
      if (!brand.siteNameAr?.trim()) {
        throw new SiteSettingsServiceError("اسم المنصة بالعربية مطلوب.", "VALIDATION_ERROR");
      }
      if (!brand.siteNameEn?.trim()) {
        throw new SiteSettingsServiceError("اسم المنصة بالإنجليزية مطلوب.", "VALIDATION_ERROR");
      }
    }

    const hasRealActor = await actorExists(actorId);
    const valuesRecord = values as unknown as Record<string, unknown>;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const field of groupDef.fields) {
        const value = serializeValue(valuesRecord[field.key]);
        await tx.siteSetting.upsert({
          where: { group_key: { group, key: field.settingKey } },
          create: { group, key: field.settingKey, value, valueType: field.valueType, updatedById: hasRealActor ? actorId : null },
          update: { value, updatedById: hasRealActor ? actorId : null },
        });
      }

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "UPDATE_SITE_SETTINGS",
            entityType: "SiteSetting",
            entityId: group,
            before: undefined,
            after: Object.fromEntries(Object.entries(values as unknown as Record<string, unknown>)) as Record<
              string,
              string | number | boolean | null
            >,
          },
        });
      } else {
        warnAuditSkipped("UPDATE_SITE_SETTINGS", group, actorId);
      }
    });

    return values;
  }
}

export const siteSettingsAdminService = new SiteSettingsAdminService();
