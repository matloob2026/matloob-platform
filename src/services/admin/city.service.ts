/**
 * CityAdminService
 * =================
 * Completes the Cities CMS as a real, database-backed management
 * layer, reusing the EXISTING `City`/`CityTranslation` models — no new
 * model, no migration. Replaces the mock-driven Cities tab on
 * /admin/localization (see src/services/mock/localization.mock.ts,
 * now removed).
 *
 * Follows the exact conventions established in
 * src/services/admin/category.service.ts and country.service.ts (see
 * their docstrings for the full rationale: typed *ServiceError class,
 * type-only `Prisma.TransactionClient` import, `undefined` not `null`
 * for empty Json audit fields, actor-exists-gated AdminAuditLog rows).
 *
 * SAFE DELETE: `City` is referenced (with NO cascade) by
 * `Request.cityId` and `UserProfile.cityId`. Deleting a city that
 * either still references would throw a database foreign-key
 * violation; this service checks first and refuses with a clear
 * message, recommending deactivation instead (which
 * src/lib/request-form-options.ts already honors — inactive cities
 * are excluded from the Create Request form).
 *
 * VERIFICATION NOTE: same sandbox limitation documented in
 * category.service.ts — `prisma generate` cannot complete here
 * because the network proxy blocks binaries.prisma.sh.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CityServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION_ERROR" | "DUPLICATE_SLUG" | "CONFLICT"
  ) {
    super(message);
    this.name = "CityServiceError";
  }
}

export function cityServiceErrorStatus(code: CityServiceError["code"]): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "DUPLICATE_SLUG":
      return 409;
    case "CONFLICT":
      return 409;
    case "VALIDATION_ERROR":
    default:
      return 400;
  }
}

export interface AdminCityListItem {
  id: string;
  countryId: string;
  countryCode: string;
  countryNameAr: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CityInput {
  countryId: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateCityInput = Partial<CityInput>;

interface TranslationRow {
  locale: string;
  name: string;
}

interface CityRecord {
  id: string;
  countryId: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  translations: TranslationRow[];
  country: { code: string; translations: TranslationRow[] };
}

const CITY_INCLUDE = {
  translations: true,
  country: { include: { translations: true } },
};

function toListItem(city: CityRecord): AdminCityListItem {
  const ar = city.translations.find((t: TranslationRow) => t.locale === "ar");
  const en = city.translations.find((t: TranslationRow) => t.locale === "en");
  const countryAr = city.country.translations.find((t: TranslationRow) => t.locale === "ar");
  return {
    id: city.id,
    countryId: city.countryId,
    countryCode: city.country.code,
    countryNameAr: countryAr?.name ?? city.country.translations[0]?.name ?? "",
    slug: city.slug,
    nameAr: ar?.name ?? city.translations[0]?.name ?? "",
    nameEn: en?.name ?? city.translations[0]?.name ?? "",
    isActive: city.isActive,
    sortOrder: city.sortOrder,
    createdAt: city.createdAt,
    updatedAt: city.updatedAt,
  };
}

function toSnapshot(city: CityRecord): Record<string, string | number | boolean | null> {
  return {
    countryId: city.countryId,
    slug: city.slug,
    isActive: city.isActive,
    sortOrder: city.sortOrder,
    nameAr: city.translations.find((t: TranslationRow) => t.locale === "ar")?.name ?? null,
    nameEn: city.translations.find((t: TranslationRow) => t.locale === "en")?.name ?? null,
  };
}

function validateInput(input: CityInput): void {
  if (!input.countryId?.trim()) {
    throw new CityServiceError("الدولة مطلوبة.", "VALIDATION_ERROR");
  }
  if (!input.slug || !SLUG_PATTERN.test(input.slug)) {
    throw new CityServiceError(
      "الرابط (Slug) مطلوب ويجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط، مثل al-khobar.",
      "VALIDATION_ERROR"
    );
  }
  if (!input.nameAr?.trim()) {
    throw new CityServiceError("اسم المدينة بالعربية مطلوب.", "VALIDATION_ERROR");
  }
  if (!input.nameEn?.trim()) {
    throw new CityServiceError("اسم المدينة بالإنجليزية مطلوب.", "VALIDATION_ERROR");
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

export class CityAdminService {
  /** Optionally filtered by country — the Admin Cities tab's country
   * selector (reusing the existing Countries data) drives this. */
  async listCities(countryId?: string): Promise<AdminCityListItem[]> {
    const cities = await prisma.city.findMany({
      where: countryId ? { countryId } : undefined,
      include: CITY_INCLUDE,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return cities.map((c: CityRecord) => toListItem(c));
  }

  async createCity(input: CityInput, actorId: string): Promise<AdminCityListItem> {
    validateInput(input);

    const country = await prisma.country.findUnique({ where: { id: input.countryId } });
    if (!country) {
      throw new CityServiceError("الدولة المحددة غير موجودة.", "VALIDATION_ERROR");
    }

    const existing = await prisma.city.findUnique({
      where: { countryId_slug: { countryId: input.countryId, slug: input.slug } },
    });
    if (existing) {
      throw new CityServiceError(`الرابط "${input.slug}" مستخدم بالفعل لمدينة أخرى في نفس الدولة.`, "DUPLICATE_SLUG");
    }

    const hasRealActor = await actorExists(actorId);

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const city = await tx.city.create({
        data: {
          countryId: input.countryId,
          slug: input.slug,
          isActive: input.isActive ?? true,
          sortOrder: input.sortOrder ?? 0,
          translations: {
            create: [
              { locale: "ar", name: input.nameAr },
              { locale: "en", name: input.nameEn },
            ],
          },
        },
        include: CITY_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "CREATE_CITY",
            entityType: "City",
            entityId: city.id,
            before: undefined,
            after: { slug: city.slug, nameAr: input.nameAr, nameEn: input.nameEn, countryId: input.countryId },
          },
        });
      } else {
        warnAuditSkipped("CREATE_CITY", city.id, actorId);
      }

      return city;
    });

    return toListItem(created);
  }

  async updateCity(id: string, input: UpdateCityInput, actorId: string): Promise<AdminCityListItem> {
    const before = await prisma.city.findUnique({ where: { id }, include: CITY_INCLUDE });
    if (!before) {
      throw new CityServiceError("المدينة غير موجودة.", "NOT_FOUND");
    }

    const merged: CityInput = {
      countryId: input.countryId ?? before.countryId,
      slug: input.slug ?? before.slug,
      nameAr: input.nameAr ?? before.translations.find((t: TranslationRow) => t.locale === "ar")?.name ?? "",
      nameEn: input.nameEn ?? before.translations.find((t: TranslationRow) => t.locale === "en")?.name ?? "",
      isActive: input.isActive ?? before.isActive,
      sortOrder: input.sortOrder ?? before.sortOrder,
    };
    validateInput(merged);

    if (merged.countryId !== before.countryId) {
      const country = await prisma.country.findUnique({ where: { id: merged.countryId } });
      if (!country) {
        throw new CityServiceError("الدولة المحددة غير موجودة.", "VALIDATION_ERROR");
      }
    }

    if (merged.slug !== before.slug || merged.countryId !== before.countryId) {
      const slugTaken = await prisma.city.findUnique({
        where: { countryId_slug: { countryId: merged.countryId, slug: merged.slug } },
      });
      if (slugTaken) {
        throw new CityServiceError(`الرابط "${merged.slug}" مستخدم بالفعل لمدينة أخرى في نفس الدولة.`, "DUPLICATE_SLUG");
      }
    }

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const city = await tx.city.update({
        where: { id },
        data: {
          countryId: merged.countryId,
          slug: merged.slug,
          isActive: merged.isActive,
          sortOrder: merged.sortOrder,
          translations: {
            upsert: [
              {
                where: { cityId_locale: { cityId: id, locale: "ar" } },
                create: { locale: "ar", name: merged.nameAr },
                update: { name: merged.nameAr },
              },
              {
                where: { cityId_locale: { cityId: id, locale: "en" } },
                create: { locale: "en", name: merged.nameEn },
                update: { name: merged.nameEn },
              },
            ],
          },
        },
        include: CITY_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "UPDATE_CITY",
            entityType: "City",
            entityId: id,
            before: toSnapshot(before),
            after: toSnapshot(city),
          },
        });
      } else {
        warnAuditSkipped("UPDATE_CITY", id, actorId);
      }

      return city;
    });

    return toListItem(updated);
  }

  async setCityActive(id: string, isActive: boolean, actorId: string): Promise<AdminCityListItem> {
    const before = await prisma.city.findUnique({ where: { id }, include: CITY_INCLUDE });
    if (!before) {
      throw new CityServiceError("المدينة غير موجودة.", "NOT_FOUND");
    }

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const city = await tx.city.update({ where: { id }, data: { isActive }, include: CITY_INCLUDE });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: isActive ? "ACTIVATE_CITY" : "DEACTIVATE_CITY",
            entityType: "City",
            entityId: id,
            before: { isActive: before.isActive },
            after: { isActive: city.isActive },
          },
        });
      } else {
        warnAuditSkipped(isActive ? "ACTIVATE_CITY" : "DEACTIVATE_CITY", id, actorId);
      }

      return city;
    });

    return toListItem(updated);
  }

  /** Safe delete: refuses when the city still has requests or user
   * profiles referencing it. */
  async deleteCity(id: string, actorId: string): Promise<void> {
    const city = await prisma.city.findUnique({ where: { id }, include: CITY_INCLUDE });
    if (!city) {
      throw new CityServiceError("المدينة غير موجودة.", "NOT_FOUND");
    }

    const [requestCount, profileCount] = await Promise.all([
      prisma.request.count({ where: { cityId: id } }),
      prisma.userProfile.count({ where: { cityId: id } }),
    ]);

    if (requestCount > 0) {
      throw new CityServiceError(
        `لا يمكن حذف هذه المدينة لأنها مستخدمة في ${requestCount.toLocaleString("ar")} طلب. يمكنك تعطيلها بدلاً من ذلك.`,
        "CONFLICT"
      );
    }
    if (profileCount > 0) {
      throw new CityServiceError(
        "لا يمكن حذف هذه المدينة لوجود مستخدمين مرتبطين بها. يمكنك تعطيلها بدلاً من ذلك.",
        "CONFLICT"
      );
    }

    const hasRealActor = await actorExists(actorId);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.city.delete({ where: { id } });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "DELETE_CITY",
            entityType: "City",
            entityId: id,
            before: toSnapshot(city),
            after: undefined,
          },
        });
      } else {
        warnAuditSkipped("DELETE_CITY", id, actorId);
      }
    });
  }
}

export const cityAdminService = new CityAdminService();
