/**
 * BlogAdminService
 * ================
 * Blog module. Owns every read/write the Admin Dashboard's Blog
 * screen needs, against the `BlogPost`/`BlogPostTranslation` models
 * (prisma/schema.prisma) added for this module. Deliberately reuses
 * every other existing structure instead of inventing parallel ones:
 *   - taxonomy: the EXISTING `Category` model (`BlogPost.categoryId`)
 *     — no separate "BlogCategory" model,
 *   - featured image + gallery: the EXISTING `Media` model
 *     (`BlogPost.featuredMediaId`, and `BlogPost.gallery` — a
 *     many-to-many mirroring the exact same pattern
 *     `Request.media` already uses),
 *   - authorship: the EXISTING `User` model (`BlogPost.authorId`,
 *     optional — see the mock-session note below),
 *   - SEO: the EXISTING `SeoSetting` model, via
 *     `entityType: "blog_post"`, `entityId: BlogPost.id` — see
 *     src/services/admin/seo.service.ts, reused as-is, not
 *     duplicated. The Admin Blog form's SEO section wires directly to
 *     that service's existing `getSeo`/`saveSeo`, the same way
 *     StaticPagesManager.tsx already does.
 *   - "rich text": this project has never had a WYSIWYG editor
 *     anywhere — the closest existing thing is the plain-text +
 *     automatic paragraph/heading/list formatting already built for
 *     Static Pages (see PublicPageContent.tsx). Blog article content
 *     reuses that exact convention rather than introducing a new
 *     editor library.
 *
 * Slug auto-generation and independent Arabic/English editing follow
 * the exact same conventions already established in
 * category.service.ts (transliteration-based slugify + uniqueness
 * suffixing) and static-page.service.ts (a locale row is only written
 * when that locale actually has content — never forced, never
 * destructive to the other language on save).
 *
 * Follows every other admin service's conventions: a typed
 * `BlogServiceError`, `Prisma.TransactionClient` (type-only import),
 * `undefined` (not `null`) for empty nullable Json audit fields, and
 * the same mock-session actor-exists gate documented in
 * category.service.ts (Phase 2's mock admin ids aren't real `User`
 * rows yet, so `AdminAuditLog` writes are skipped with a console
 * warning rather than throwing).
 *
 * VERIFICATION NOTE: same sandbox limitation documented in every
 * other admin service — `prisma generate` cannot complete here
 * because the network proxy blocks binaries.prisma.sh. This code is
 * written directly against the real schema (including the new
 * `BlogPost`/`BlogPostTranslation` models added for this module,
 * verified by hand-applying the migration SQL to a real local
 * PostgreSQL instance) and is expected to run as-is once
 * `prisma generate` + `prisma migrate deploy` succeed with real
 * network access (e.g. on Vercel).
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ---------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------

export class BlogServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION_ERROR" | "DUPLICATE_SLUG" | "CONFLICT"
  ) {
    super(message);
    this.name = "BlogServiceError";
  }
}

export function blogServiceErrorStatus(code: BlogServiceError["code"]): number {
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

export type BlogPostStatusValue = "DRAFT" | "PUBLISHED";

export interface AdminBlogPostListItem {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string;
  excerptEn: string;
  contentAr: string;
  contentEn: string;
  status: BlogPostStatusValue;
  publishedAt: Date | null;
  sortOrder: number;
  categoryId: string | null;
  categoryName: string | null;
  featuredMedia: { id: string; url: string } | null;
  gallery: { id: string; url: string }[];
  authorName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogPostInput {
  /** No longer required from the admin — always auto-generated (see
   * `generateUniqueSlug` below) when omitted on create. Editing an
   * existing article never regenerates its slug automatically (that
   * would break existing public URLs) — passing one explicitly is
   * still supported for the rare case an admin needs to fix a typo. */
  slug?: string;
  /** At least one of titleAr/titleEn is required — never both. See
   * `resolveTitles` below for how the other one is derived when
   * omitted. */
  titleAr?: string;
  titleEn?: string;
  excerptAr?: string | null;
  excerptEn?: string | null;
  contentAr?: string | null;
  contentEn?: string | null;
  status?: BlogPostStatusValue;
  sortOrder?: number;
  categoryId?: string | null;
  /** Existing `Media` row id, chosen via `<MediaPicker>` — never a
   * fresh upload from this form itself; uploading stays exclusively a
   * Media Library action. `null` clears the selection. */
  featuredMediaId?: string | null;
  /** Existing `Media` row ids, chosen via `<MediaPicker>` — the
   * article's gallery (reuses the same many-to-many pattern
   * Request.media already established). */
  galleryMediaIds?: string[];
}

export type UpdateBlogPostInput = Partial<BlogPostInput>;

/** Once `updateBlogPost` merges an update onto the existing article,
 * `slug`/`titleAr`/`titleEn` are always resolved to real strings —
 * this narrower type captures that guarantee so Prisma's required
 * `name`/`slug` columns never see `string | undefined` from
 * TypeScript's point of view (the exact class of build error already
 * fixed once in category.service.ts's `ResolvedCategoryInput` — same
 * fix, applied here from the start). */
type ResolvedBlogPostInput = Omit<BlogPostInput, "slug" | "titleAr" | "titleEn"> & {
  slug: string;
  titleAr: string;
  titleEn: string;
};

// ---------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------

interface TranslationRow {
  locale: string;
  title: string;
  excerpt: string | null;
  content: string | null;
}

interface BlogPostRecord {
  id: string;
  slug: string;
  categoryId: string | null;
  featuredMediaId: string | null;
  authorId: string | null;
  status: string;
  publishedAt: Date | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  translations: TranslationRow[];
  category: { translations: { locale: string; name: string }[] } | null;
  featuredMedia: { id: string; url: string } | null;
  gallery: { id: string; url: string }[];
  author: { profile: { displayName: string } | null } | null;
}

const BLOG_POST_INCLUDE = {
  translations: true,
  category: { include: { translations: true } },
  featuredMedia: { select: { id: true, url: true } },
  gallery: { select: { id: true, url: true } },
  author: { include: { profile: { select: { displayName: true } } } },
};

function resolveLocaleText<T extends { locale: string }>(rows: T[], locale: string): T | undefined {
  return rows.find((r) => r.locale === locale) ?? rows[0];
}

function toListItem(post: BlogPostRecord): AdminBlogPostListItem {
  const ar = post.translations.find((t) => t.locale === "ar");
  const en = post.translations.find((t) => t.locale === "en");
  const categoryName = post.category
    ? resolveLocaleText(post.category.translations, "ar")?.name ?? null
    : null;
  return {
    id: post.id,
    slug: post.slug,
    titleAr: ar?.title ?? "",
    titleEn: en?.title ?? "",
    excerptAr: ar?.excerpt ?? "",
    excerptEn: en?.excerpt ?? "",
    contentAr: ar?.content ?? "",
    contentEn: en?.content ?? "",
    status: post.status as BlogPostStatusValue,
    publishedAt: post.publishedAt,
    sortOrder: post.sortOrder,
    categoryId: post.categoryId,
    categoryName,
    featuredMedia: post.featuredMedia,
    gallery: post.gallery,
    authorName: post.author?.profile?.displayName ?? null,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

type BlogAuditSnapshot = Record<string, string | number | boolean | null>;

function toAuditSnapshot(post: BlogPostRecord): BlogAuditSnapshot {
  return {
    slug: post.slug,
    status: post.status,
    sortOrder: post.sortOrder,
    titleAr: post.translations.find((t) => t.locale === "ar")?.title ?? null,
    titleEn: post.translations.find((t) => t.locale === "en")?.title ?? null,
  };
}

/** At least one of titleAr/titleEn is required — never both (see
 * BlogPostInput's docstring). Everything else is optional/defaulted. */
function validateInput(input: BlogPostInput): void {
  if (!input.titleAr?.trim() && !input.titleEn?.trim()) {
    throw new BlogServiceError("أدخل عنوان المقال بالعربية أو بالإنجليزية على الأقل.", "VALIDATION_ERROR");
  }
  if (input.slug !== undefined && (!input.slug || !SLUG_PATTERN.test(input.slug))) {
    throw new BlogServiceError(
      "الرابط (Slug) يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط، مثل my-article.",
      "VALIDATION_ERROR"
    );
  }
}

/** Fills in whichever of titleAr/titleEn is missing so an article
 * never displays blank in the Arabic-primary public UI — same
 * convention as category.service.ts's `resolveNames`. */
function resolveTitles(titleAr: string | undefined, titleEn: string | undefined): { titleAr: string; titleEn: string } {
  const ar = titleAr?.trim() ?? "";
  const en = titleEn?.trim() ?? "";
  return { titleAr: ar || en, titleEn: en };
}

/** Best-effort Arabic → Latin transliteration for slug generation only
 * — identical table to category.service.ts's (each admin service is
 * self-contained; no shared "SlugService" abstraction exists anywhere
 * in this codebase, so this mirrors the established per-service
 * pattern rather than introducing a new one). */
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

function baseSlugFromTitles(titleAr: string, titleEn: string): string {
  if (titleEn.trim()) {
    const fromEn = slugify(titleEn);
    if (fromEn) return fromEn;
  }
  if (titleAr.trim()) {
    const fromAr = slugify(transliterateArabic(titleAr));
    if (fromAr) return fromAr;
  }
  return "article";
}

async function generateUniqueSlug(titleAr: string, titleEn: string, excludeId?: string): Promise<string> {
  const base = baseSlugFromTitles(titleAr, titleEn);
  let candidate = base;
  let suffix = 2;
  while (
    await prisma.blogPost.findFirst({
      where: { slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
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
// Service
// ---------------------------------------------------------------------

export interface ListBlogPostsFilters {
  search?: string;
  status?: BlogPostStatusValue;
  categoryId?: string;
}

export class BlogAdminService {
  /** All articles (draft + published) — the Admin screen manages
   * both. Search matches title/excerpt in either language; filtering
   * by status/category happens the same way every other Admin list in
   * this CMS filters (in-memory, after a single list query — same
   * approach CategoriesManager/StaticPagesManager already use client-
   * side; this mirrors it server-side for the initial page load). */
  async listPosts(filters?: ListBlogPostsFilters): Promise<AdminBlogPostListItem[]> {
    const posts = await prisma.blogPost.findMany({
      include: BLOG_POST_INCLUDE,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    let items: AdminBlogPostListItem[] = posts.map((p: BlogPostRecord) => toListItem(p));

    if (filters?.status) {
      items = items.filter((item) => item.status === filters.status);
    }
    if (filters?.categoryId) {
      items = items.filter((item) => item.categoryId === filters.categoryId);
    }
    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.titleAr.toLowerCase().includes(q) ||
          item.titleEn.toLowerCase().includes(q) ||
          item.excerptAr.toLowerCase().includes(q) ||
          item.excerptEn.toLowerCase().includes(q)
      );
    }

    return items;
  }

  async getPost(id: string): Promise<AdminBlogPostListItem> {
    const post = await prisma.blogPost.findUnique({ where: { id }, include: BLOG_POST_INCLUDE });
    if (!post) {
      throw new BlogServiceError("المقال غير موجود.", "NOT_FOUND");
    }
    return toListItem(post);
  }

  async createPost(input: BlogPostInput, actorId: string): Promise<AdminBlogPostListItem> {
    validateInput(input);

    const { titleAr, titleEn } = resolveTitles(input.titleAr, input.titleEn);
    const slug = input.slug?.trim() || (await generateUniqueSlug(titleAr, titleEn));

    if (input.slug?.trim()) {
      const existing = await prisma.blogPost.findUnique({ where: { slug } });
      if (existing) {
        throw new BlogServiceError(`الرابط "${slug}" مستخدم بالفعل لمقال آخر.`, "DUPLICATE_SLUG");
      }
    }

    const status = input.status ?? "DRAFT";
    const hasRealActor = await actorExists(actorId);

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const post = await tx.blogPost.create({
        data: {
          slug,
          status,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
          sortOrder: input.sortOrder ?? 0,
          categoryId: input.categoryId ?? null,
          featuredMediaId: input.featuredMediaId ?? null,
          authorId: hasRealActor ? actorId : null,
          gallery: input.galleryMediaIds?.length
            ? { connect: input.galleryMediaIds.map((id) => ({ id })) }
            : undefined,
          translations: {
            create: [
              { locale: "ar", title: titleAr, excerpt: input.excerptAr ?? null, content: input.contentAr ?? null },
              ...(titleEn
                ? [{ locale: "en", title: titleEn, excerpt: input.excerptEn ?? null, content: input.contentEn ?? null }]
                : []),
            ],
          },
        },
        include: BLOG_POST_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "CREATE_BLOG_POST",
            entityType: "BlogPost",
            entityId: post.id,
            before: undefined,
            after: { slug: post.slug, titleAr, titleEn, status: post.status },
          },
        });
      } else {
        warnAuditSkipped("CREATE_BLOG_POST", post.id, actorId);
      }

      return post;
    });

    return toListItem(created);
  }

  async updatePost(id: string, input: UpdateBlogPostInput, actorId: string): Promise<AdminBlogPostListItem> {
    const before = await prisma.blogPost.findUnique({ where: { id }, include: BLOG_POST_INCLUDE });
    if (!before) {
      throw new BlogServiceError("المقال غير موجود.", "NOT_FOUND");
    }

    const beforeTitleAr = before.translations.find((t: TranslationRow) => t.locale === "ar")?.title ?? "";
    const beforeTitleEn = before.translations.find((t: TranslationRow) => t.locale === "en")?.title ?? "";
    const { titleAr, titleEn } = resolveTitles(input.titleAr ?? beforeTitleAr, input.titleEn ?? beforeTitleEn);

    // The slug is deliberately NOT regenerated from a title change here
    // — only an explicitly-provided `input.slug` changes it — so
    // editing an article's title never silently breaks its existing
    // public URL (same rule as category.service.ts/static-page.service.ts).
    const merged: ResolvedBlogPostInput = {
      slug: input.slug ?? before.slug,
      titleAr,
      titleEn,
      excerptAr: input.excerptAr ?? before.translations.find((t: TranslationRow) => t.locale === "ar")?.excerpt ?? null,
      excerptEn: input.excerptEn ?? before.translations.find((t: TranslationRow) => t.locale === "en")?.excerpt ?? null,
      contentAr: input.contentAr ?? before.translations.find((t: TranslationRow) => t.locale === "ar")?.content ?? null,
      contentEn: input.contentEn ?? before.translations.find((t: TranslationRow) => t.locale === "en")?.content ?? null,
      status: input.status ?? (before.status as BlogPostStatusValue),
      sortOrder: input.sortOrder ?? before.sortOrder,
      categoryId: input.categoryId !== undefined ? input.categoryId : before.categoryId,
      featuredMediaId: input.featuredMediaId !== undefined ? input.featuredMediaId : before.featuredMediaId,
      galleryMediaIds: input.galleryMediaIds,
    };
    validateInput(merged);

    if (merged.slug !== before.slug) {
      const slugTaken = await prisma.blogPost.findUnique({ where: { slug: merged.slug } });
      if (slugTaken) {
        throw new BlogServiceError(`الرابط "${merged.slug}" مستخدم بالفعل لمقال آخر.`, "DUPLICATE_SLUG");
      }
    }

    const hasEnglishContent = Boolean(merged.titleEn.trim());
    const wasPublished = before.status === "PUBLISHED";
    const willBePublished = merged.status === "PUBLISHED";
    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const post = await tx.blogPost.update({
        where: { id },
        data: {
          slug: merged.slug,
          status: merged.status,
          // Only stamps publishedAt the FIRST time an article goes
          // from draft to published — re-saving an already-published
          // article never resets its original publish date.
          publishedAt: !wasPublished && willBePublished ? new Date() : before.publishedAt,
          sortOrder: merged.sortOrder,
          categoryId: merged.categoryId ?? null,
          featuredMediaId: merged.featuredMediaId ?? null,
          ...(merged.galleryMediaIds !== undefined
            ? { gallery: { set: merged.galleryMediaIds.map((mediaId) => ({ id: mediaId })) } }
            : {}),
          translations: {
            upsert: [
              {
                where: { postId_locale: { postId: id, locale: "ar" } },
                create: { locale: "ar", title: merged.titleAr, excerpt: merged.excerptAr, content: merged.contentAr },
                update: { title: merged.titleAr, excerpt: merged.excerptAr, content: merged.contentAr },
              },
              ...(hasEnglishContent
                ? [
                    {
                      where: { postId_locale: { postId: id, locale: "en" } },
                      create: {
                        locale: "en",
                        title: merged.titleEn,
                        excerpt: merged.excerptEn,
                        content: merged.contentEn,
                      },
                      update: { title: merged.titleEn, excerpt: merged.excerptEn, content: merged.contentEn },
                    },
                  ]
                : []),
            ],
          },
        },
        include: BLOG_POST_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "UPDATE_BLOG_POST",
            entityType: "BlogPost",
            entityId: id,
            before: toAuditSnapshot(before),
            after: toAuditSnapshot(post),
          },
        });
      } else {
        warnAuditSkipped("UPDATE_BLOG_POST", id, actorId);
      }

      return post;
    });

    return toListItem(updated);
  }

  /** Sets DRAFT/PUBLISHED directly — the quick toggle the Admin list
   * uses, separate from the full edit form. */
  async setStatus(id: string, status: BlogPostStatusValue, actorId: string): Promise<AdminBlogPostListItem> {
    const before = await prisma.blogPost.findUnique({ where: { id }, include: BLOG_POST_INCLUDE });
    if (!before) {
      throw new BlogServiceError("المقال غير موجود.", "NOT_FOUND");
    }

    const wasPublished = before.status === "PUBLISHED";
    const willBePublished = status === "PUBLISHED";
    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const post = await tx.blogPost.update({
        where: { id },
        data: {
          status,
          publishedAt: !wasPublished && willBePublished ? new Date() : before.publishedAt,
        },
        include: BLOG_POST_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: status === "PUBLISHED" ? "PUBLISH_BLOG_POST" : "UNPUBLISH_BLOG_POST",
            entityType: "BlogPost",
            entityId: id,
            before: { status: before.status },
            after: { status: post.status },
          },
        });
      } else {
        warnAuditSkipped(status === "PUBLISHED" ? "PUBLISH_BLOG_POST" : "UNPUBLISH_BLOG_POST", id, actorId);
      }

      return post;
    });

    return toListItem(updated);
  }

  /** Blog posts have no external references the way Categories/Static
   * Pages might (nothing else in the schema points AT a BlogPost), so
   * delete is always safe — no usage check needed. `onDelete: Cascade`
   * on `BlogPostTranslation` cleans up translations automatically; the
   * gallery join-table rows are removed by Prisma's implicit
   * many-to-many disconnect on delete. */
  async deletePost(id: string, actorId: string): Promise<void> {
    const post = await prisma.blogPost.findUnique({ where: { id }, include: { translations: true } });
    if (!post) {
      throw new BlogServiceError("المقال غير موجود.", "NOT_FOUND");
    }

    const hasRealActor = await actorExists(actorId);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.blogPost.delete({ where: { id } });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "DELETE_BLOG_POST",
            entityType: "BlogPost",
            entityId: id,
            before: {
              slug: post.slug,
              titleAr: post.translations.find((t: { locale: string; title: string }) => t.locale === "ar")?.title ?? null,
              titleEn: post.translations.find((t: { locale: string; title: string }) => t.locale === "en")?.title ?? null,
            },
            after: undefined,
          },
        });
      } else {
        warnAuditSkipped("DELETE_BLOG_POST", id, actorId);
      }
    });
  }
}

export const blogAdminService = new BlogAdminService();
