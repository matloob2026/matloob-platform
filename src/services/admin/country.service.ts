/**
 * CountryAdminService
 * ====================
 * Completes the Countries CMS as a real, database-backed management
 * layer, reusing the EXISTING `Country`/`CountryTranslation` models
 * (prisma/schema.prisma) — no new model, no migration. Replaces the
 * mock-driven Countries tab on /admin/localization (see
 * src/services/mock/localization.mock.ts, now removed).
 *
 * Follows the exact conventions established in
 * src/services/admin/category.service.ts:
 *   - a typed `CountryServiceError` instead of string-matching thrown
 *     errors,
 *   - only a type-only import of `Prisma` (`Prisma.TransactionClient`),
 *   - nullable Json audit fields use `undefined`, never `null`,
 *   - every mutation wrapped in `prisma.$transaction`, writing an
 *     `AdminAuditLog` row in the same transaction, skipped gracefully
 *     when `actorId` doesn't resolve to a real `User` row yet (Phase 2
 *     mock-session limitation — see category.service.ts's docstring).
 *
 * SAFE DELETE: `Country` is referenced (with NO cascade — a plain FK)
 * by `City.countryId`, `UserProfile.countryId`, and `Request.countryId`.
 * Deleting a country that any of these still reference would throw a
 * database foreign-key violation; this service checks first and
 * refuses with a clear message, recommending deactivation instead
 * (deactivating is always safe — it only affects whether the country
 * is offered to new Create Request submissions, via
 * src/lib/request-form-options.ts, which already filters on
 * `isActive`). `CountryCurrency` links (linking a country to its
 * supported currencies) DO cascade, and are treated as safe collateral
 * of deleting a country that has none of the above three references —
 * they are not independently "referenced data" in the same protective
 * sense.
 *
 * VERIFICATION NOTE: same sandbox limitation already documented in
 * category.service.ts — `prisma generate` cannot complete in this
 * sandbox because the network proxy blocks binaries.prisma.sh. This
 * code is written directly against the real schema and is expected to
 * run as-is once `prisma generate` + `prisma migrate deploy` succeed
 * with real network access (e.g. on Vercel).
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const CODE_PATTERN = /^[A-Z]{2,3}$/;

export class CountryServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION_ERROR" | "DUPLICATE_CODE" | "CONFLICT"
  ) {
    super(message);
    this.name = "CountryServiceError";
  }
}

export function countryServiceErrorStatus(code: CountryServiceError["code"]): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "DUPLICATE_CODE":
      return 409;
    case "CONFLICT":
      return 409;
    case "VALIDATION_ERROR":
    default:
      return 400;
  }
}

export interface AdminCountryListItem {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
  isDefault: boolean;
  phoneDialCode: string | null;
  cityCount: number;
  currencyCodes: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CountryInput {
  code: string;
  nameAr: string;
  nameEn: string;
  isActive?: boolean;
  isDefault?: boolean;
  phoneDialCode?: string | null;
}

export type UpdateCountryInput = Partial<CountryInput>;

interface TranslationRow {
  locale: string;
  name: string;
}

interface CountryRecord {
  id: string;
  code: string;
  isActive: boolean;
  isDefault: boolean;
  phoneDialCode: string | null;
  createdAt: Date;
  updatedAt: Date;
  translations: TranslationRow[];
  _count: { cities: number };
  currencies: { currency: { code: string } }[];
}

const COUNTRY_INCLUDE = {
  translations: true,
  _count: { select: { cities: true } },
  currencies: { include: { currency: { select: { code: true } } } },
};

function toListItem(country: CountryRecord): AdminCountryListItem {
  const ar = country.translations.find((t: TranslationRow) => t.locale === "ar");
  const en = country.translations.find((t: TranslationRow) => t.locale === "en");
  return {
    id: country.id,
    code: country.code,
    nameAr: ar?.name ?? country.translations[0]?.name ?? "",
    nameEn: en?.name ?? country.translations[0]?.name ?? "",
    isActive: country.isActive,
    isDefault: country.isDefault,
    phoneDialCode: country.phoneDialCode,
    cityCount: country._count.cities,
    currencyCodes: country.currencies.map((c) => c.currency.code),
    createdAt: country.createdAt,
    updatedAt: country.updatedAt,
  };
}

function toSnapshot(country: CountryRecord): Record<string, string | number | boolean | null> {
  return {
    code: country.code,
    isActive: country.isActive,
    isDefault: country.isDefault,
    nameAr: country.translations.find((t: TranslationRow) => t.locale === "ar")?.name ?? null,
    nameEn: country.translations.find((t: TranslationRow) => t.locale === "en")?.name ?? null,
  };
}

function validateInput(input: CountryInput): void {
  const code = input.code?.trim().toUpperCase() ?? "";
  if (!code || !CODE_PATTERN.test(code)) {
    throw new CountryServiceError(
      "رمز الدولة (ISO) مطلوب ويجب أن يتكون من حرفين أو ثلاثة أحرف إنجليزية كبيرة، مثل SA أو EG.",
      "VALIDATION_ERROR"
    );
  }
  if (!input.nameAr?.trim()) {
    throw new CountryServiceError("اسم الدولة بالعربية مطلوب.", "VALIDATION_ERROR");
  }
  if (!input.nameEn?.trim()) {
    throw new CountryServiceError("اسم الدولة بالإنجليزية مطلوب.", "VALIDATION_ERROR");
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

export class CountryAdminService {
  async listCountries(): Promise<AdminCountryListItem[]> {
    const countries = await prisma.country.findMany({
      include: COUNTRY_INCLUDE,
      orderBy: [{ isDefault: "desc" }, { code: "asc" }],
    });
    return countries.map((c: CountryRecord) => toListItem(c));
  }

  async createCountry(input: CountryInput, actorId: string): Promise<AdminCountryListItem> {
    const normalized: CountryInput = { ...input, code: input.code?.trim().toUpperCase() ?? "" };
    validateInput(normalized);

    const existing = await prisma.country.findUnique({ where: { code: normalized.code } });
    if (existing) {
      throw new CountryServiceError(`رمز الدولة "${normalized.code}" مستخدم بالفعل.`, "DUPLICATE_CODE");
    }

    const hasRealActor = await actorExists(actorId);

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (normalized.isDefault) {
        await tx.country.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      }

      const country = await tx.country.create({
        data: {
          code: normalized.code,
          isActive: normalized.isActive ?? true,
          isDefault: normalized.isDefault ?? false,
          phoneDialCode: normalized.phoneDialCode ?? null,
          defaultLocale: "ar",
          translations: {
            create: [
              { locale: "ar", name: normalized.nameAr },
              { locale: "en", name: normalized.nameEn },
            ],
          },
        },
        include: COUNTRY_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "CREATE_COUNTRY",
            entityType: "Country",
            entityId: country.id,
            before: undefined,
            after: { code: country.code, nameAr: normalized.nameAr, nameEn: normalized.nameEn, isActive: country.isActive },
          },
        });
      } else {
        warnAuditSkipped("CREATE_COUNTRY", country.id, actorId);
      }

      return country;
    });

    return toListItem(created);
  }

  async updateCountry(id: string, input: UpdateCountryInput, actorId: string): Promise<AdminCountryListItem> {
    const before = await prisma.country.findUnique({ where: { id }, include: COUNTRY_INCLUDE });
    if (!before) {
      throw new CountryServiceError("الدولة غير موجودة.", "NOT_FOUND");
    }

    const merged: CountryInput = {
      code: (input.code ?? before.code).trim().toUpperCase(),
      nameAr: input.nameAr ?? before.translations.find((t: TranslationRow) => t.locale === "ar")?.name ?? "",
      nameEn: input.nameEn ?? before.translations.find((t: TranslationRow) => t.locale === "en")?.name ?? "",
      isActive: input.isActive ?? before.isActive,
      isDefault: input.isDefault ?? before.isDefault,
      phoneDialCode: input.phoneDialCode !== undefined ? input.phoneDialCode : before.phoneDialCode,
    };
    validateInput(merged);

    if (merged.code !== before.code) {
      const codeTaken = await prisma.country.findUnique({ where: { code: merged.code } });
      if (codeTaken) {
        throw new CountryServiceError(`رمز الدولة "${merged.code}" مستخدم بالفعل.`, "DUPLICATE_CODE");
      }
    }

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (merged.isDefault) {
        await tx.country.updateMany({ where: { isDefault: true, NOT: { id } }, data: { isDefault: false } });
      }

      const country = await tx.country.update({
        where: { id },
        data: {
          code: merged.code,
          isActive: merged.isActive,
          isDefault: merged.isDefault,
          phoneDialCode: merged.phoneDialCode ?? null,
          translations: {
            upsert: [
              {
                where: { countryId_locale: { countryId: id, locale: "ar" } },
                create: { locale: "ar", name: merged.nameAr },
                update: { name: merged.nameAr },
              },
              {
                where: { countryId_locale: { countryId: id, locale: "en" } },
                create: { locale: "en", name: merged.nameEn },
                update: { name: merged.nameEn },
              },
            ],
          },
        },
        include: COUNTRY_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "UPDATE_COUNTRY",
            entityType: "Country",
            entityId: id,
            before: toSnapshot(before),
            after: toSnapshot(country),
          },
        });
      } else {
        warnAuditSkipped("UPDATE_COUNTRY", id, actorId);
      }

      return country;
    });

    return toListItem(updated);
  }

  async setCountryActive(id: string, isActive: boolean, actorId: string): Promise<AdminCountryListItem> {
    const before = await prisma.country.findUnique({ where: { id }, include: COUNTRY_INCLUDE });
    if (!before) {
      throw new CountryServiceError("الدولة غير موجودة.", "NOT_FOUND");
    }

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const country = await tx.country.update({ where: { id }, data: { isActive }, include: COUNTRY_INCLUDE });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: isActive ? "ACTIVATE_COUNTRY" : "DEACTIVATE_COUNTRY",
            entityType: "Country",
            entityId: id,
            before: { isActive: before.isActive },
            after: { isActive: country.isActive },
          },
        });
      } else {
        warnAuditSkipped(isActive ? "ACTIVATE_COUNTRY" : "DEACTIVATE_COUNTRY", id, actorId);
      }

      return country;
    });

    return toListItem(updated);
  }

  /**
   * Safe delete: refuses when the country still has cities, user
   * profiles, or requests referencing it (a plain FK — the database
   * would reject the delete anyway, but this gives a clear, specific
   * message instead of a raw constraint error). `CountryCurrency`
   * links cascade automatically and aren't checked — see class
   * docstring.
   */
  async deleteCountry(id: string, actorId: string): Promise<void> {
    const country = await prisma.country.findUnique({ where: { id }, include: { translations: true } });
    if (!country) {
      throw new CountryServiceError("الدولة غير موجودة.", "NOT_FOUND");
    }

    const [cityCount, profileCount, requestCount] = await Promise.all([
      prisma.city.count({ where: { countryId: id } }),
      prisma.userProfile.count({ where: { countryId: id } }),
      prisma.request.count({ where: { countryId: id } }),
    ]);

    if (cityCount > 0) {
      throw new CountryServiceError(
        `لا يمكن حذف هذه الدولة لوجود ${cityCount.toLocaleString("ar")} مدينة مرتبطة بها. احذف المدن أولاً أو قم بتعطيل الدولة بدلاً من ذلك.`,
        "CONFLICT"
      );
    }
    if (profileCount > 0) {
      throw new CountryServiceError(
        `لا يمكن حذف هذه الدولة لوجود مستخدمين مرتبطين بها. يمكنك تعطيلها بدلاً من ذلك.`,
        "CONFLICT"
      );
    }
    if (requestCount > 0) {
      throw new CountryServiceError(
        `لا يمكن حذف هذه الدولة لأنها مستخدمة في ${requestCount.toLocaleString("ar")} طلب. يمكنك تعطيلها بدلاً من ذلك.`,
        "CONFLICT"
      );
    }

    const hasRealActor = await actorExists(actorId);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.country.delete({ where: { id } });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "DELETE_COUNTRY",
            entityType: "Country",
            entityId: id,
            before: {
              code: country.code,
              nameAr: country.translations.find((t: TranslationRow) => t.locale === "ar")?.name ?? null,
              nameEn: country.translations.find((t: TranslationRow) => t.locale === "en")?.name ?? null,
            },
            after: undefined,
          },
        });
      } else {
        warnAuditSkipped("DELETE_COUNTRY", id, actorId);
      }
    });
  }
}

export const countryAdminService = new CountryAdminService();
