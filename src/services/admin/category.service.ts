/**
 * CategoryAdminService
 * ====================
 * CMS Checkpoint 01 — first real, database-backed content-management
 * service. Owns every read/write the Admin Dashboard's Categories
 * screen needs, against the EXISTING `Category` / `CategoryTranslation`
 * models in prisma/schema.prisma (see docs/ARCHITECTURE.md,
 * src/admin/README.md) — no new models, no duplicate data structures.
 *
 * Follows the same conventions already established in
 * src/services/request.service.ts and src/services/media.service.ts:
 *   - a typed `CategoryServiceError` (+ status mapper) instead of
 *     string-matching thrown errors,
 *   - Prisma is the only data access (imported from src/lib/prisma),
 *   - callers (server actions / route handlers) stay thin,
 *   - only a type-only import of `Prisma` (`Prisma.TransactionClient`),
 *     used solely to type the `$transaction` interactive-callback
 *     parameter correctly — `typeof prisma` is NOT the same type as the
 *     transaction client `$transaction` passes in (it omits methods like
 *     `$transaction` itself), which caused a real Prisma
 *     overload-mismatch build error; `Prisma.TransactionClient` is
 *     Prisma's own official type for this exact parameter.
 *   - nullable Json audit fields (`before`/`after`) that have no
 *     snapshot to record use `undefined`, not `null` — the generated
 *     Prisma input type for a nullable Json field is
 *     `NullableJsonNullValueInput | InputJsonValue | undefined`, which
 *     does not include plain `null`. `undefined` simply omits the key
 *     (the column keeps its default/NULL), which is exactly the
 *     intended "no snapshot" meaning here, without needing a runtime
 *     import of `Prisma.DbNull`/`Prisma.JsonNull`.
 *
 * Additionally follows src/admin/README.md's "Architectural rule":
 * every mutation here writes an `AdminAuditLog` row in the same
 * `prisma.$transaction` as the mutation itself (before/after snapshots).
 *
 * KNOWN SANDBOX-CARRYOVER LIMITATION (documented the same way
 * request.service.ts and auth.service.ts already document it): the
 * Admin Dashboard's authentication is still the Phase 2 mock-session
 * layer (src/auth/mock-session.ts) — its demo admin ids
 * ("mock-admin-1", "mock-moderator-1") do not exist as real `User` rows
 * yet, and `AdminAuditLog.actorId` is a required foreign key to `User`.
 * Writing the audit row unconditionally would throw a foreign-key
 * violation on every mutation performed through the mock session and
 * take the whole action down with it. Each write method below checks
 * the actor exists first and skips the audit row (with a console
 * warning) when it doesn't, so category mutations keep working today.
 * Once real NextAuth-backed admin accounts are wired up (see
 * mock-session.ts docstring), `actorId` will resolve to a real `User`
 * row and audit logging starts writing with no code change required
 * here.
 *
 * VERIFICATION NOTE: same sandbox limitation already documented in
 * request.service.ts — `prisma generate` cannot complete in this
 * sandbox because the network proxy blocks binaries.prisma.sh. This
 * code is written directly against the real schema and is expected to
 * run as-is once `prisma generate` + `prisma migrate deploy` succeed
 * with real network access (e.g. on Vercel).
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ---------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------

export class CategoryServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION_ERROR" | "DUPLICATE_SLUG" | "CONFLICT"
  ) {
    super(message);
    this.name = "CategoryServiceError";
  }
}

export function categoryServiceErrorStatus(code: CategoryServiceError["code"]): number {
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

// ---------------------------------------------------------------------
// Input / output contracts
// ---------------------------------------------------------------------

export interface AdminCategoryListItem {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  isActive: boolean;
  sortOrder: number;
  parentId: string | null;
  /** Count of non-deleted requests currently using this category. */
  requestCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryInput {
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateCategoryInput = Partial<CategoryInput>;

// ---------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------

interface TranslationRow {
  locale: string;
  name: string;
  description: string | null;
}

/** Shape of a Category row as returned with our standard `include`
 * below — hand-written (rather than `Prisma.CategoryGetPayload`) so
 * this file matches the rest of the codebase's convention of never
 * importing the generated `Prisma` namespace. */
interface CategoryRecord {
  id: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  translations: TranslationRow[];
  _count: { requests: number };
}

const CATEGORY_INCLUDE = {
  translations: true,
  _count: { select: { requests: { where: { deletedAt: null } } } },
};

function toListItem(category: CategoryRecord): AdminCategoryListItem {
  const ar = category.translations.find((t: TranslationRow) => t.locale === "ar");
  const en = category.translations.find((t: TranslationRow) => t.locale === "en");
  return {
    id: category.id,
    slug: category.slug,
    nameAr: ar?.name ?? category.translations[0]?.name ?? "",
    nameEn: en?.name ?? category.translations[0]?.name ?? "",
    descriptionAr: ar?.description ?? null,
    descriptionEn: en?.description ?? null,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    parentId: category.parentId,
    requestCount: category._count.requests,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

function toAuditSnapshot(category: CategoryRecord): Record<string, unknown> {
  return {
    slug: category.slug,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    nameAr: category.translations.find((t: TranslationRow) => t.locale === "ar")?.name ?? null,
    nameEn: category.translations.find((t: TranslationRow) => t.locale === "en")?.name ?? null,
  };
}

function validateInput(input: CategoryInput): void {
  if (!input.slug || !SLUG_PATTERN.test(input.slug)) {
    throw new CategoryServiceError(
      "الرابط (Slug) مطلوب ويجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط، مثل real-estate.",
      "VALIDATION_ERROR"
    );
  }
  if (!input.nameAr?.trim()) {
    throw new CategoryServiceError("الاسم بالعربية مطلوب.", "VALIDATION_ERROR");
  }
  if (!input.nameEn?.trim()) {
    throw new CategoryServiceError("الاسم بالإنجليزية مطلوب.", "VALIDATION_ERROR");
  }
}

/** True if `actorId` resolves to a real `User` row — see the class
 * docstring above for why this gate exists. */
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
// Service
// ---------------------------------------------------------------------

export class CategoryAdminService {
  /** All categories (active + inactive) — the Admin screen manages both. */
  async listCategories(): Promise<AdminCategoryListItem[]> {
    const categories = await prisma.category.findMany({
      include: CATEGORY_INCLUDE,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return categories.map((c: CategoryRecord) => toListItem(c));
  }

  async getCategory(id: string): Promise<AdminCategoryListItem> {
    const category = await prisma.category.findUnique({ where: { id }, include: CATEGORY_INCLUDE });
    if (!category) {
      throw new CategoryServiceError("التصنيف غير موجود.", "NOT_FOUND");
    }
    return toListItem(category);
  }

  async createCategory(input: CategoryInput, actorId: string): Promise<AdminCategoryListItem> {
    validateInput(input);

    const existing = await prisma.category.findUnique({ where: { slug: input.slug } });
    if (existing) {
      throw new CategoryServiceError(`الرابط "${input.slug}" مستخدم بالفعل لتصنيف آخر.`, "DUPLICATE_SLUG");
    }

    const hasRealActor = await actorExists(actorId);

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const category = await tx.category.create({
        data: {
          slug: input.slug,
          isActive: input.isActive ?? true,
          sortOrder: input.sortOrder ?? 0,
          translations: {
            create: [
              { locale: "ar", name: input.nameAr, description: input.descriptionAr ?? null },
              { locale: "en", name: input.nameEn, description: input.descriptionEn ?? null },
            ],
          },
        },
        include: CATEGORY_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "CREATE_CATEGORY",
            entityType: "Category",
            entityId: category.id,
            before: undefined,
            after: { slug: category.slug, nameAr: input.nameAr, nameEn: input.nameEn, isActive: category.isActive },
          },
        });
      } else {
        warnAuditSkipped("CREATE_CATEGORY", category.id, actorId);
      }

      return category;
    });

    return toListItem(created);
  }

  async updateCategory(id: string, input: UpdateCategoryInput, actorId: string): Promise<AdminCategoryListItem> {
    const before = await prisma.category.findUnique({ where: { id }, include: CATEGORY_INCLUDE });
    if (!before) {
      throw new CategoryServiceError("التصنيف غير موجود.", "NOT_FOUND");
    }

    // Merge onto existing values so a partial edit still passes full validation.
    const merged: CategoryInput = {
      slug: input.slug ?? before.slug,
      nameAr: input.nameAr ?? before.translations.find((t: TranslationRow) => t.locale === "ar")?.name ?? "",
      nameEn: input.nameEn ?? before.translations.find((t: TranslationRow) => t.locale === "en")?.name ?? "",
      descriptionAr:
        input.descriptionAr ?? before.translations.find((t: TranslationRow) => t.locale === "ar")?.description ?? null,
      descriptionEn:
        input.descriptionEn ?? before.translations.find((t: TranslationRow) => t.locale === "en")?.description ?? null,
      isActive: input.isActive ?? before.isActive,
      sortOrder: input.sortOrder ?? before.sortOrder,
    };
    validateInput(merged);

    if (merged.slug !== before.slug) {
      const slugTaken = await prisma.category.findUnique({ where: { slug: merged.slug } });
      if (slugTaken) {
        throw new CategoryServiceError(`الرابط "${merged.slug}" مستخدم بالفعل لتصنيف آخر.`, "DUPLICATE_SLUG");
      }
    }

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const category = await tx.category.update({
        where: { id },
        data: {
          slug: merged.slug,
          isActive: merged.isActive,
          sortOrder: merged.sortOrder,
          translations: {
            upsert: [
              {
                where: { categoryId_locale: { categoryId: id, locale: "ar" } },
                create: { locale: "ar", name: merged.nameAr, description: merged.descriptionAr ?? null },
                update: { name: merged.nameAr, description: merged.descriptionAr ?? null },
              },
              {
                where: { categoryId_locale: { categoryId: id, locale: "en" } },
                create: { locale: "en", name: merged.nameEn, description: merged.descriptionEn ?? null },
                update: { name: merged.nameEn, description: merged.descriptionEn ?? null },
              },
            ],
          },
        },
        include: CATEGORY_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "UPDATE_CATEGORY",
            entityType: "Category",
            entityId: id,
            before: toAuditSnapshot(before),
            after: toAuditSnapshot(category),
          },
        });
      } else {
        warnAuditSkipped("UPDATE_CATEGORY", id, actorId);
      }

      return category;
    });

    return toListItem(updated);
  }

  /** Activate/deactivate — the safe, reversible alternative to deleting
   * a category that already has requests attached to it. */
  async setCategoryActive(id: string, isActive: boolean, actorId: string): Promise<AdminCategoryListItem> {
    const before = await prisma.category.findUnique({ where: { id }, include: CATEGORY_INCLUDE });
    if (!before) {
      throw new CategoryServiceError("التصنيف غير موجود.", "NOT_FOUND");
    }

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const category = await tx.category.update({
        where: { id },
        data: { isActive },
        include: CATEGORY_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: isActive ? "ACTIVATE_CATEGORY" : "DEACTIVATE_CATEGORY",
            entityType: "Category",
            entityId: id,
            before: { isActive: before.isActive },
            after: { isActive: category.isActive },
          },
        });
      } else {
        warnAuditSkipped(isActive ? "ACTIVATE_CATEGORY" : "DEACTIVATE_CATEGORY", id, actorId);
      }

      return category;
    });

    return toListItem(updated);
  }

  /**
   * Safe delete: refuses to remove a category that is still referenced
   * by ANY request (including soft-deleted ones — the foreign key row
   * still exists) or that still has sub-categories under it. In both
   * cases the caller should deactivate instead, which is always safe.
   */
  async deleteCategory(id: string, actorId: string): Promise<void> {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!category) {
      throw new CategoryServiceError("التصنيف غير موجود.", "NOT_FOUND");
    }

    const [requestCount, childCount] = await Promise.all([
      prisma.request.count({ where: { categoryId: id } }),
      prisma.category.count({ where: { parentId: id } }),
    ]);

    if (requestCount > 0) {
      throw new CategoryServiceError(
        `لا يمكن حذف هذا التصنيف لأنه مستخدم في ${requestCount.toLocaleString("ar")} طلب. يمكنك تعطيله بدلاً من ذلك.`,
        "CONFLICT"
      );
    }
    if (childCount > 0) {
      throw new CategoryServiceError(
        "لا يمكن حذف هذا التصنيف لوجود تصنيفات فرعية مرتبطة به. أزل التصنيفات الفرعية أولاً أو قم بتعطيله.",
        "CONFLICT"
      );
    }

    const hasRealActor = await actorExists(actorId);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.category.delete({ where: { id } });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "DELETE_CATEGORY",
            entityType: "Category",
            entityId: id,
            before: {
              slug: category.slug,
              nameAr: category.translations.find((t: TranslationRow) => t.locale === "ar")?.name ?? null,
              nameEn: category.translations.find((t: TranslationRow) => t.locale === "en")?.name ?? null,
            },
            after: undefined,
          },
        });
      } else {
        warnAuditSkipped("DELETE_CATEGORY", id, actorId);
      }
    });
  }
}

export const categoryAdminService = new CategoryAdminService();
