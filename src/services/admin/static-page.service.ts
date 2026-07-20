/**
 * StaticPageAdminService
 * ======================
 * CMS Checkpoint 03 — real, database-backed content-management
 * service for owner-authored static pages ("About", "Terms",
 * "Privacy", "Contact", ...), reusing the EXISTING `PageContent` model
 * (prisma/schema.prisma) — no new model, no migration.
 *
 * MODEL REUSE: `PageContent.page` is already documented in the schema
 * as `String // "homepage" | "about" | ...` — "about" is literally the
 * example given. A static page is stored as TWO `PageContent` rows
 * (one per locale) sharing `page = <slug>` and a constant
 * `section = "main"` (distinct from Checkpoint 02's homepage sections
 * — "hero" | "how_it_works" | "cta" | "footer_statement" — so the two
 * features can never collide on the same (page, section) pair except
 * for the reserved "homepage" slug, which is explicitly blocked below
 * since Checkpoint 02 already owns `page = "homepage"` rows):
 *   - `heading`     -> page title
 *   - `body`        -> page content
 *   - `isPublished` -> active/inactive status
 * `ctaLabel`/`ctaUrl`/`mediaId`/`extra` are left null — out of this
 * checkpoint's scope (no CTA, no media management for static pages).
 *
 * Since a static page spans two rows (ar + en) with two different
 * primary keys, `slug` (not a synthetic id) is the stable identifier
 * every method below takes — matching how Checkpoint 02's homepage
 * main content has no id either (also a (page, section) pair).
 * Renaming a slug on update is supported by updating each locale row's
 * `page` field by its own `id`, after re-checking uniqueness.
 *
 * Follows the exact conventions established in
 * src/services/admin/category.service.ts (Checkpoint 01) and
 * src/services/homepage-content.service.ts (Checkpoint 02):
 *   - a typed `StaticPageServiceError` instead of string-matching
 *     thrown errors,
 *   - only a type-only import of `Prisma` (`Prisma.TransactionClient`),
 *   - nullable Json audit fields use `undefined`, never `null`,
 *   - every mutation wrapped in `prisma.$transaction`, writing an
 *     `AdminAuditLog` row in the same transaction, skipped gracefully
 *     (with a console warning) when `actorId` doesn't resolve to a
 *     real `User` row yet (Phase 2 mock-session limitation — see
 *     category.service.ts's docstring for the full explanation).
 *
 * SAFE DELETE: nothing in the schema holds a foreign key to
 * `PageContent`, so a static page's two rows can always be deleted
 * without a database-level conflict. There is also no other feature in
 * this codebase that links to a static page by slug yet (the
 * footer's "Terms"/"Privacy" links are still plain `href="#"`
 * placeholders in the locked homepage markup — see
 * src/content/marketing/homepage-body.html), so there is nothing to
 * break. Delete is still gated behind the same permission + audit-log
 * pattern as every other mutation here, and deactivation remains the
 * always-safe alternative surfaced in the Admin UI.
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

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SECTION = "main";

/**
 * Normalizes a raw slug before validation: trims surrounding
 * whitespace and lowercases it. This is a pure hardening step, not a
 * relaxation of the rule — the accepted character set (English
 * lowercase letters, digits, single hyphens between segments) is
 * unchanged; this only means "About " and "ABOUT" are treated the same
 * as "about" rather than being rejected for incidental
 * casing/whitespace from typing or copy-paste. Applied before
 * `validateInput` in every mutation below, so `about`,
 * `privacy-policy`, `terms`, `contact`, and `my-new-page` are always
 * accepted exactly as typed.
 */
function normalizeSlug(rawSlug: string): string {
  return rawSlug.trim().toLowerCase();
}

/** Checkpoint 02 already owns `page = "homepage"` rows (section: hero |
 * how_it_works | cta | footer_statement) — reserved so a static page
 * can never alias over them, and so `/pages/homepage` can never be
 * confused with the real `/` homepage. */
const RESERVED_SLUGS = new Set(["homepage"]);

// ---------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------

export class StaticPageServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION_ERROR" | "DUPLICATE_SLUG" | "CONFLICT"
  ) {
    super(message);
    this.name = "StaticPageServiceError";
  }
}

export function staticPageServiceErrorStatus(code: StaticPageServiceError["code"]): number {
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

export interface StaticPageListItem {
  slug: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StaticPageInput {
  slug: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  isActive?: boolean;
}

export type UpdateStaticPageInput = Partial<StaticPageInput>;

// ---------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------

interface PageContentRow {
  id: string;
  page: string;
  locale: string;
  heading: string | null;
  body: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toListItem(rows: PageContentRow[]): StaticPageListItem {
  if (rows.length === 0) {
    throw new StaticPageServiceError("الصفحة غير موجودة.", "NOT_FOUND");
  }
  const ar = rows.find((r) => r.locale === "ar");
  const en = rows.find((r) => r.locale === "en");
  const anyRow = ar ?? en ?? rows[0]!;
  return {
    slug: anyRow.page,
    titleAr: ar?.heading ?? "",
    titleEn: en?.heading ?? "",
    contentAr: ar?.body ?? "",
    contentEn: en?.body ?? "",
    isActive: anyRow.isPublished,
    createdAt: rows.reduce((min, r) => (r.createdAt < min ? r.createdAt : min), anyRow.createdAt),
    updatedAt: rows.reduce((max, r) => (r.updatedAt > max ? r.updatedAt : max), anyRow.updatedAt),
  };
}

function toSnapshot(rows: PageContentRow[]): Record<string, string | number | boolean | null> {
  const ar = rows.find((r) => r.locale === "ar");
  const en = rows.find((r) => r.locale === "en");
  return {
    slug: (ar ?? en ?? rows[0])?.page ?? null,
    titleAr: ar?.heading ?? null,
    titleEn: en?.heading ?? null,
    isActive: (ar ?? en ?? rows[0])?.isPublished ?? null,
  };
}

function validateInput(input: StaticPageInput): void {
  if (!input.slug || !SLUG_PATTERN.test(input.slug)) {
    throw new StaticPageServiceError(
      "الرابط (Slug) مطلوب ويجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط، مثل privacy-policy.",
      "VALIDATION_ERROR"
    );
  }
  if (RESERVED_SLUGS.has(input.slug)) {
    throw new StaticPageServiceError(`الرابط "${input.slug}" محجوز ولا يمكن استخدامه.`, "VALIDATION_ERROR");
  }

  // CMS Checkpoint 04: the admin is no longer forced to fill in BOTH
  // languages — they can pick a language (via the Admin form's
  // العربية/English tabs) and save with just that one. A language row
  // is only touched if the admin actually provided content for it (see
  // createPage/updatePage below), so saving Arabic-only never deletes
  // or overwrites any existing English content, and vice versa. What's
  // still required: the slug, and at least one language fully
  // filled in (title AND content together) — a half-filled language
  // (title with no content, or content with no title) is rejected as
  // a likely mistake rather than silently accepted.
  const arProvided = Boolean(input.titleAr?.trim() || input.contentAr?.trim());
  const enProvided = Boolean(input.titleEn?.trim() || input.contentEn?.trim());

  if (arProvided && (!input.titleAr?.trim() || !input.contentAr?.trim())) {
    throw new StaticPageServiceError(
      "أدخل العنوان والمحتوى بالعربية معاً، أو اترك اللغة العربية فارغة بالكامل واكتفِ بالإنجليزية.",
      "VALIDATION_ERROR"
    );
  }
  if (enProvided && (!input.titleEn?.trim() || !input.contentEn?.trim())) {
    throw new StaticPageServiceError(
      "أدخل العنوان والمحتوى بالإنجليزية معاً، أو اترك اللغة الإنجليزية فارغة بالكامل واكتفِ بالعربية.",
      "VALIDATION_ERROR"
    );
  }
  if (!arProvided && !enProvided) {
    throw new StaticPageServiceError(
      "أدخل العنوان والمحتوى للغة واحدة على الأقل (عربي أو إنجليزي).",
      "VALIDATION_ERROR"
    );
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

async function findPageRows(slug: string): Promise<PageContentRow[]> {
  return prisma.pageContent.findMany({ where: { page: slug, section: SECTION } });
}

// ---------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------

export class StaticPageAdminService {
  async listPages(): Promise<StaticPageListItem[]> {
    const rows = await prisma.pageContent.findMany({
      where: { section: SECTION },
      orderBy: [{ page: "asc" }],
    });
    const bySlug = new Map<string, PageContentRow[]>();
    for (const row of rows) {
      const list = bySlug.get(row.page) ?? [];
      list.push(row);
      bySlug.set(row.page, list);
    }
    return Array.from(bySlug.values()).map((group) => toListItem(group));
  }

  async getPage(slug: string): Promise<StaticPageListItem> {
    const rows = await findPageRows(slug);
    if (rows.length === 0) {
      throw new StaticPageServiceError("الصفحة غير موجودة.", "NOT_FOUND");
    }
    return toListItem(rows);
  }

  async createPage(input: StaticPageInput, actorId: string): Promise<StaticPageListItem> {
    input = { ...input, slug: normalizeSlug(input.slug ?? "") };
    validateInput(input);

    const existing = await findPageRows(input.slug);
    if (existing.length > 0) {
      throw new StaticPageServiceError(`الرابط "${input.slug}" مستخدم بالفعل لصفحة أخرى.`, "DUPLICATE_SLUG");
    }

    const hasRealActor = await actorExists(actorId);
    const arProvided = Boolean(input.titleAr?.trim() && input.contentAr?.trim());
    const enProvided = Boolean(input.titleEn?.trim() && input.contentEn?.trim());

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const rows: PageContentRow[] = [];

      if (arProvided) {
        rows.push(
          await tx.pageContent.create({
            data: {
              page: input.slug,
              section: SECTION,
              locale: "ar",
              heading: input.titleAr,
              body: input.contentAr,
              isPublished: input.isActive ?? true,
            },
          })
        );
      }
      if (enProvided) {
        rows.push(
          await tx.pageContent.create({
            data: {
              page: input.slug,
              section: SECTION,
              locale: "en",
              heading: input.titleEn,
              body: input.contentEn,
              isPublished: input.isActive ?? true,
            },
          })
        );
      }

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "CREATE_STATIC_PAGE",
            entityType: "PageContent",
            entityId: input.slug,
            before: undefined,
            after: {
              slug: input.slug,
              titleAr: input.titleAr,
              titleEn: input.titleEn,
              isActive: rows[0]?.isPublished ?? (input.isActive ?? true),
            },
          },
        });
      } else {
        warnAuditSkipped("CREATE_STATIC_PAGE", input.slug, actorId);
      }

      return rows;
    });

    return toListItem(created);
  }

  async updatePage(slug: string, input: UpdateStaticPageInput, actorId: string): Promise<StaticPageListItem> {
    const before = await findPageRows(slug);
    if (before.length === 0) {
      throw new StaticPageServiceError("الصفحة غير موجودة.", "NOT_FOUND");
    }
    const beforeAr = before.find((r) => r.locale === "ar");
    const beforeEn = before.find((r) => r.locale === "en");

    const merged: StaticPageInput = {
      slug: normalizeSlug(input.slug ?? slug),
      titleAr: input.titleAr ?? beforeAr?.heading ?? "",
      titleEn: input.titleEn ?? beforeEn?.heading ?? "",
      contentAr: input.contentAr ?? beforeAr?.body ?? "",
      contentEn: input.contentEn ?? beforeEn?.body ?? "",
      isActive: input.isActive ?? beforeAr?.isPublished ?? beforeEn?.isPublished ?? true,
    };
    validateInput(merged);

    if (merged.slug !== slug) {
      const slugTaken = await findPageRows(merged.slug);
      if (slugTaken.length > 0) {
        throw new StaticPageServiceError(`الرابط "${merged.slug}" مستخدم بالفعل لصفحة أخرى.`, "DUPLICATE_SLUG");
      }
    }

    // CMS Checkpoint 04: a language row is only written when that
    // language is actually complete in the merged result. A language
    // that already existed and wasn't touched round-trips unchanged
    // (preserved, never overwritten by the other language's edit); a
    // language that didn't exist yet gets CREATED here the first time
    // the admin fills it in — so switching to the English tab later
    // and saving adds English without disturbing the existing Arabic
    // row, and vice versa.
    const arProvided = Boolean(merged.titleAr.trim() && merged.contentAr.trim());
    const enProvided = Boolean(merged.titleEn.trim() && merged.contentEn.trim());

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const rows: PageContentRow[] = [];

      if (arProvided) {
        const row = beforeAr
          ? await tx.pageContent.update({
              where: { id: beforeAr.id },
              data: { page: merged.slug, heading: merged.titleAr, body: merged.contentAr, isPublished: merged.isActive },
            })
          : await tx.pageContent.create({
              data: {
                page: merged.slug,
                section: SECTION,
                locale: "ar",
                heading: merged.titleAr,
                body: merged.contentAr,
                isPublished: merged.isActive,
              },
            });
        rows.push(row);
      } else if (beforeAr) {
        // Slug/isActive still apply platform-wide even if this
        // language wasn't (re)provided this time.
        rows.push(
          await tx.pageContent.update({
            where: { id: beforeAr.id },
            data: { page: merged.slug, isPublished: merged.isActive },
          })
        );
      }

      if (enProvided) {
        const row = beforeEn
          ? await tx.pageContent.update({
              where: { id: beforeEn.id },
              data: { page: merged.slug, heading: merged.titleEn, body: merged.contentEn, isPublished: merged.isActive },
            })
          : await tx.pageContent.create({
              data: {
                page: merged.slug,
                section: SECTION,
                locale: "en",
                heading: merged.titleEn,
                body: merged.contentEn,
                isPublished: merged.isActive,
              },
            });
        rows.push(row);
      } else if (beforeEn) {
        rows.push(
          await tx.pageContent.update({
            where: { id: beforeEn.id },
            data: { page: merged.slug, isPublished: merged.isActive },
          })
        );
      }

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "UPDATE_STATIC_PAGE",
            entityType: "PageContent",
            entityId: merged.slug,
            before: toSnapshot(before),
            after: toSnapshot(rows),
          },
        });
      } else {
        warnAuditSkipped("UPDATE_STATIC_PAGE", merged.slug, actorId);
      }

      return rows;
    });

    return toListItem(updated);
  }

  /** Activate/deactivate — the always-safe alternative to deleting a
   * static page. */
  async setPageActive(slug: string, isActive: boolean, actorId: string): Promise<StaticPageListItem> {
    const before = await findPageRows(slug);
    if (before.length === 0) {
      throw new StaticPageServiceError("الصفحة غير موجودة.", "NOT_FOUND");
    }

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const rows: PageContentRow[] = [];
      for (const row of before) {
        const updatedRow = await tx.pageContent.update({ where: { id: row.id }, data: { isPublished: isActive } });
        rows.push(updatedRow);
      }

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: isActive ? "ACTIVATE_STATIC_PAGE" : "DEACTIVATE_STATIC_PAGE",
            entityType: "PageContent",
            entityId: slug,
            before: { isActive: before[0]?.isPublished ?? null },
            after: { isActive },
          },
        });
      } else {
        warnAuditSkipped(isActive ? "ACTIVATE_STATIC_PAGE" : "DEACTIVATE_STATIC_PAGE", slug, actorId);
      }

      return rows;
    });

    return toListItem(updated);
  }

  /** See the class docstring's "SAFE DELETE" note — nothing in the
   * schema references a static page by foreign key, so this is always
   * safe to perform; still gated behind permission + audit logging. */
  async deletePage(slug: string, actorId: string): Promise<void> {
    const rows = await findPageRows(slug);
    if (rows.length === 0) {
      throw new StaticPageServiceError("الصفحة غير موجودة.", "NOT_FOUND");
    }

    const hasRealActor = await actorExists(actorId);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const row of rows) {
        await tx.pageContent.delete({ where: { id: row.id } });
      }

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "DELETE_STATIC_PAGE",
            entityType: "PageContent",
            entityId: slug,
            before: toSnapshot(rows),
            after: undefined,
          },
        });
      } else {
        warnAuditSkipped("DELETE_STATIC_PAGE", slug, actorId);
      }
    });
  }
}

export const staticPageAdminService = new StaticPageAdminService();
