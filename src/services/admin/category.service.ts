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
  /** Media Library integration — reuses the existing `Media` model via
   * `Category.iconMediaId`/`imageMediaId` (already in the schema, never
   * exposed in the Admin form before this task). Resolved to
   * `{id, url}` here (not just the id) so the Admin form's
   * `<MediaPicker>` can show the current selection immediately. */
  iconMedia: { id: string; url: string } | null;
  imageMedia: { id: string; url: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryInput {
  /** No longer required from the admin — always auto-generated (see
   * `generateUniqueSlug` below) when omitted on create. Editing an
   * existing category never regenerates its slug automatically (that
   * would break existing public URLs) — passing one explicitly is
   * still supported for the rare case an admin needs to fix a typo. */
  slug?: string;
  /** At least one of nameAr/nameEn is required — never both. See
   * `resolveNames` below for how the other one is derived when
   * omitted. */
  nameAr?: string;
  nameEn?: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  /** Optional parent category — completes the hierarchy the `Category`
   * model already supports (self-relation via `parentId`) but which
   * the Admin form previously never exposed. `null`/omitted means a
   * top-level category. */
  parentId?: string | null;
  /** Existing `Media` row ids, chosen via `<MediaPicker>` — never a
   * fresh upload from this form itself; uploading stays exclusively a
   * Media Library action. `null` clears the selection. */
  iconMediaId?: string | null;
  imageMediaId?: string | null;
}

export type UpdateCategoryInput = Partial<CategoryInput>;

/** `CategoryInput.slug`/`nameAr`/`nameEn` are optional on the PUBLIC
 * input type (an admin may omit any of them — see CategoryInput's
 * docstring). Once `updateCategory` below merges an update onto the
 * existing category, though, all three are always resolved to a real
 * string (falling back to the existing row's value, or to
 * `resolveNames`'s guaranteed non-empty `nameAr`) — this narrower type
 * captures that guarantee so Prisma's `create`/`update` calls (whose
 * `name`/`slug` columns are required, non-nullable strings) never see
 * `string | undefined` from TypeScript's point of view, even though
 * `CategoryInput` itself declares them optional. */
type ResolvedCategoryInput = Omit<CategoryInput, "slug" | "nameAr" | "nameEn"> & {
  slug: string;
  nameAr: string;
  nameEn: string;
};

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
  iconMediaId: string | null;
  imageMediaId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  translations: TranslationRow[];
  _count: { requests: number };
  icon: { id: string; url: string } | null;
  image: { id: string; url: string } | null;
}

const CATEGORY_INCLUDE = {
  translations: true,
  _count: { select: { requests: { where: { deletedAt: null } } } },
  icon: { select: { id: true, url: true } },
  image: { select: { id: true, url: true } },
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
    iconMedia: category.icon,
    imageMedia: category.image,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

/** Exact JSON-safe shape audit snapshots use — narrower than
 * `Record<string, unknown>` (which Prisma's Json input type rejects,
 * since `unknown` isn't provably JSON-serializable), but still a
 * `Record<...>` rather than a plain named-property interface: Prisma's
 * generated `InputJsonObject` is `{ [key: string]: InputJsonValue }`,
 * an indexed type. A named-property-only interface has no string
 * index signature and is therefore NOT structurally assignable to it,
 * even when every individual property is itself JSON-safe. `Record`
 * carries that index signature, so this type-checks against the real
 * generated Prisma client. No import of the generated `Prisma`
 * namespace is needed either way. */
type CategoryAuditSnapshot = Record<string, string | number | boolean | null>;

function toAuditSnapshot(category: CategoryRecord): CategoryAuditSnapshot {
  return {
    slug: category.slug,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
    nameAr: category.translations.find((t: TranslationRow) => t.locale === "ar")?.name ?? null,
    nameEn: category.translations.find((t: TranslationRow) => t.locale === "en")?.name ?? null,
  };
}

/** At least one of nameAr/nameEn is required — never both (see
 * CategoryInput's docstring). Everything else about a category is
 * optional/defaulted. */
function validateInput(input: CategoryInput): void {
  if (!input.nameAr?.trim() && !input.nameEn?.trim()) {
    throw new CategoryServiceError("أدخل اسم التصنيف بالعربية أو بالإنجليزية على الأقل.", "VALIDATION_ERROR");
  }
  if (input.slug !== undefined && (!input.slug || !SLUG_PATTERN.test(input.slug))) {
    throw new CategoryServiceError(
      "الرابط (Slug) يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط، مثل real-estate.",
      "VALIDATION_ERROR"
    );
  }
}

/** Fills in whichever of nameAr/nameEn is missing so a category never
 * displays blank in the Arabic-primary public UI: an empty Arabic name
 * is mirrored from English (the site is Arabic-first, so Arabic must
 * always have SOME value); an empty English name is simply left unset
 * — every reader already falls back to whichever locale exists (same
 * pattern already established for Static Pages' independent-language
 * support). */
function resolveNames(nameAr: string | undefined, nameEn: string | undefined): { nameAr: string; nameEn: string } {
  const ar = nameAr?.trim() ?? "";
  const en = nameEn?.trim() ?? "";
  return { nameAr: ar || en, nameEn: en };
}

/** Best-effort Arabic → Latin transliteration, used only to generate a
 * readable URL slug when no English name was provided — never shown
 * to visitors as a "translation". Common letters only; anything
 * unmapped (diacritics, punctuation) is simply dropped, which is safe
 * for a slug (see `slugify` below, which discards non-alphanumerics
 * anyway). */
const ARABIC_TRANSLITERATION: Record<string, string> = {
  ا: "a", أ: "a", إ: "a", آ: "a", ب: "b", ت: "t", ث: "th", ج: "j", ح: "h", خ: "kh",
  د: "d", ذ: "th", ر: "r", ز: "z", س: "s", ش: "sh", ص: "s", ض: "d", ط: "t", ظ: "z",
  ع: "a", غ: "gh", ف: "f", ق: "q", ك: "k", ل: "l", م: "m", ن: "n", ه: "h", و: "w",
  ي: "y", ى: "a", ة: "a", ء: "a", ئ: "y", ؤ: "w",
};

function transliterateArabic(text: string): string {
  return Array.from(text)
    .map((ch) => ARABIC_TRANSLITERATION[ch] ?? (/\s/.test(ch) ? " " : ""))
    .join("");
}

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** The one place a category's slug is ever computed from its name —
 * prefers the English name (a direct, readable slug); falls back to a
 * best-effort transliteration of the Arabic name when there's no
 * English name; falls back to a generic "category" base in the
 * unlikely case neither produces anything slug-safe (e.g. an Arabic
 * name made entirely of characters outside `ARABIC_TRANSLITERATION`).
 * Uniqueness (appending `-2`, `-3`, ...) is handled by
 * `generateUniqueSlug`, which calls this. */
function baseSlugFromNames(nameAr: string, nameEn: string): string {
  if (nameEn.trim()) {
    const fromEn = slugify(nameEn);
    if (fromEn) return fromEn;
  }
  if (nameAr.trim()) {
    const fromAr = slugify(transliterateArabic(nameAr));
    if (fromAr) return fromAr;
  }
  return "category";
}

/** Generates a slug automatically from the category's name(s) and
 * ensures it's unique, appending `-2`, `-3`, ... as needed — the admin
 * never types a slug by hand for a new category (see CategoryInput's
 * docstring). `excludeId` lets an update check uniqueness against
 * every OTHER category without colliding with itself. */
async function generateUniqueSlug(nameAr: string, nameEn: string, excludeId?: string): Promise<string> {
  const base = baseSlugFromNames(nameAr, nameEn);
  let candidate = base;
  let suffix = 2;
  while (
    await prisma.category.findFirst({
      where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/** Confirms a chosen parent category exists, and — when editing an
 * existing category (`selfId` provided) — that the chosen parent is
 * neither the category itself nor one of its own descendants, which
 * would create a cycle in the hierarchy. */
async function validateParent(parentId: string | null | undefined, selfId?: string): Promise<void> {
  if (!parentId) return;

  if (selfId && parentId === selfId) {
    throw new CategoryServiceError("لا يمكن أن يكون التصنيف أباً لنفسه.", "VALIDATION_ERROR");
  }

  const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { id: true } });
  if (!parent) {
    throw new CategoryServiceError("التصنيف الأب المحدد غير موجود.", "VALIDATION_ERROR");
  }

  if (selfId) {
    // Walk up the chosen parent's own ancestor chain — if it reaches
    // `selfId`, the chosen parent is a descendant of this category and
    // assigning it would create a cycle.
    let current: string | null = parentId;
    const seen = new Set<string>();
    while (current) {
      if (current === selfId) {
        throw new CategoryServiceError(
          "لا يمكن اختيار تصنيف فرعي كأب لهذا التصنيف — سيؤدي ذلك إلى تسلسل دائري.",
          "VALIDATION_ERROR"
        );
      }
      if (seen.has(current)) break; // defensive: pre-existing cycle, stop rather than loop forever
      seen.add(current);
      const row: { parentId: string | null } | null = await prisma.category.findUnique({
        where: { id: current },
        select: { parentId: true },
      });
      current = row?.parentId ?? null;
    }
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
    await validateParent(input.parentId);

    const { nameAr, nameEn } = resolveNames(input.nameAr, input.nameEn);
    const slug = input.slug?.trim() || (await generateUniqueSlug(nameAr, nameEn));

    if (input.slug?.trim()) {
      const existing = await prisma.category.findUnique({ where: { slug } });
      if (existing) {
        throw new CategoryServiceError(`الرابط "${slug}" مستخدم بالفعل لتصنيف آخر.`, "DUPLICATE_SLUG");
      }
    }

    const hasRealActor = await actorExists(actorId);

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const category = await tx.category.create({
        data: {
          slug,
          isActive: input.isActive ?? true,
          sortOrder: input.sortOrder ?? 0,
          parentId: input.parentId ?? null,
          iconMediaId: input.iconMediaId ?? null,
          imageMediaId: input.imageMediaId ?? null,
          translations: {
            create: [
              { locale: "ar", name: nameAr, description: input.descriptionAr ?? null },
              ...(nameEn ? [{ locale: "en", name: nameEn, description: input.descriptionEn ?? null }] : []),
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
            after: { slug: category.slug, nameAr, nameEn, isActive: category.isActive },
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

    const beforeNameAr = before.translations.find((t: TranslationRow) => t.locale === "ar")?.name ?? "";
    const beforeNameEn = before.translations.find((t: TranslationRow) => t.locale === "en")?.name ?? "";
    const { nameAr, nameEn } = resolveNames(input.nameAr ?? beforeNameAr, input.nameEn ?? beforeNameEn);

    // Merge onto existing values so a partial edit still passes full validation.
    // The slug is deliberately NOT regenerated from a name change here —
    // only an explicitly-provided `input.slug` changes it — so editing a
    // category's name never silently breaks its existing public URL
    // (see CategoryInput's docstring).
    const merged: ResolvedCategoryInput = {
      slug: input.slug ?? before.slug,
      nameAr,
      nameEn,
      descriptionAr:
        input.descriptionAr ?? before.translations.find((t: TranslationRow) => t.locale === "ar")?.description ?? null,
      descriptionEn:
        input.descriptionEn ?? before.translations.find((t: TranslationRow) => t.locale === "en")?.description ?? null,
      isActive: input.isActive ?? before.isActive,
      sortOrder: input.sortOrder ?? before.sortOrder,
      parentId: input.parentId !== undefined ? input.parentId : before.parentId,
      iconMediaId: input.iconMediaId !== undefined ? input.iconMediaId : before.iconMediaId,
      imageMediaId: input.imageMediaId !== undefined ? input.imageMediaId : before.imageMediaId,
    };
    validateInput(merged);
    await validateParent(merged.parentId, id);

    if (merged.slug !== before.slug) {
      const slugTaken = await prisma.category.findUnique({ where: { slug: merged.slug } });
      if (slugTaken) {
        throw new CategoryServiceError(`الرابط "${merged.slug}" مستخدم بالفعل لتصنيف آخر.`, "DUPLICATE_SLUG");
      }
    }

    const hasRealActor = await actorExists(actorId);
    // English is only touched when there's actually English content to
    // save — clearing the English field back to empty leaves any
    // PREVIOUSLY saved English translation untouched rather than
    // deleting it, the same "never destructive on save" rule Static
    // Pages already follow for independent-language editing.
    const hasEnglishContent = Boolean(merged.nameEn.trim());

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const category = await tx.category.update({
        where: { id },
        data: {
          slug: merged.slug,
          isActive: merged.isActive,
          sortOrder: merged.sortOrder,
          parentId: merged.parentId ?? null,
          iconMediaId: merged.iconMediaId ?? null,
          imageMediaId: merged.imageMediaId ?? null,
          translations: {
            upsert: [
              {
                where: { categoryId_locale: { categoryId: id, locale: "ar" } },
                create: { locale: "ar", name: merged.nameAr, description: merged.descriptionAr ?? null },
                update: { name: merged.nameAr, description: merged.descriptionAr ?? null },
              },
              ...(hasEnglishContent
                ? [
                    {
                      where: { categoryId_locale: { categoryId: id, locale: "en" } },
                      create: { locale: "en", name: merged.nameEn, description: merged.descriptionEn ?? null },
                      update: { name: merged.nameEn, description: merged.descriptionEn ?? null },
                    },
                  ]
                : []),
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
