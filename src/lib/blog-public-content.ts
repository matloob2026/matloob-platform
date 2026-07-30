/**
 * Read-only blog content for the public site
 * (src/app/blog/page.tsx and src/app/blog/[slug]/page.tsx).
 *
 * Mirrors src/lib/category-public-content.ts / static-page-public-content.ts:
 * a thin, page-scoped data loader (not the Admin CRUD service) reading
 * the SAME `BlogPost`/`BlogPostTranslation` models
 * src/services/admin/blog.service.ts manages. No auth requirement —
 * this is read by public pages — and every function here only ever
 * returns PUBLISHED articles, matching the same "only active/published
 * ever appears publicly" rule every other public reader in this
 * project already follows.
 */

import { prisma } from "@/lib/prisma";
import type { Locale } from "@/types/domain";

const DEFAULT_LOCALE: Locale = "ar";
const PAGE_SIZE = 9;

interface TranslationRow {
  locale: string;
  title: string;
  excerpt: string | null;
  content: string | null;
}

function resolveTitle(translations: TranslationRow[]): string {
  return translations.find((t) => t.locale === DEFAULT_LOCALE)?.title ?? translations[0]?.title ?? "";
}
function resolveExcerpt(translations: TranslationRow[]): string | null {
  return translations.find((t) => t.locale === DEFAULT_LOCALE)?.excerpt ?? translations[0]?.excerpt ?? null;
}
function resolveContent(translations: TranslationRow[]): string {
  return translations.find((t) => t.locale === DEFAULT_LOCALE)?.content ?? translations[0]?.content ?? "";
}

export interface PublicBlogPostSummary {
  slug: string;
  title: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  publishedAt: Date | null;
}

export interface PublicBlogListing {
  posts: PublicBlogPostSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PublicBlogCategoryOption {
  slug: string;
  name: string;
}

function toSummary(post: {
  slug: string;
  publishedAt: Date | null;
  translations: TranslationRow[];
  featuredMedia: { url: string } | null;
  category: { slug: string; translations: { locale: string; name: string }[] } | null;
}): PublicBlogPostSummary {
  return {
    slug: post.slug,
    title: resolveTitle(post.translations),
    excerpt: resolveExcerpt(post.translations),
    featuredImageUrl: post.featuredMedia?.url ?? null,
    categorySlug: post.category?.slug ?? null,
    categoryName: post.category
      ? post.category.translations.find((t) => t.locale === DEFAULT_LOCALE)?.name ??
        post.category.translations[0]?.name ??
        null
      : null,
    publishedAt: post.publishedAt,
  };
}

/** Published articles, newest first (respecting the admin's sort
 * order, then publish date) — optionally filtered by category slug
 * and/or a search term (matches title/excerpt), and paginated. Every
 * new published article appears automatically; every
 * deactivated/deleted/draft article disappears automatically — there
 * is no separate "public" copy of this data to keep in sync. */
export async function getPublicBlogListing(options?: {
  page?: number;
  categorySlug?: string;
  search?: string;
}): Promise<PublicBlogListing> {
  const page = Math.max(1, options?.page ?? 1);

  const where = {
    status: "PUBLISHED" as const,
    ...(options?.categorySlug ? { category: { slug: options.categorySlug } } : {}),
  };

  const [allMatching, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      include: {
        translations: true,
        featuredMedia: { select: { url: true } },
        category: { include: { translations: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
    }),
    prisma.blogPost.count({ where }),
  ]);

  // Search matches title/excerpt in either language — done in-memory
  // since it spans a related, per-locale translation row rather than
  // a single column Prisma can filter on directly (same approach
  // src/services/admin/blog.service.ts's own search filter already
  // takes for the Admin list).
  let matching = allMatching;
  if (options?.search?.trim()) {
    const q = options.search.trim().toLowerCase();
    matching = matching.filter((post: { translations: TranslationRow[] }) =>
      post.translations.some(
        (t) => t.title.toLowerCase().includes(q) || (t.excerpt ?? "").toLowerCase().includes(q)
      )
    );
  }

  const effectiveTotal = options?.search?.trim() ? matching.length : total;
  const paged = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return {
    posts: paged.map(toSummary),
    total: effectiveTotal,
    page,
    pageSize: PAGE_SIZE,
  };
}

/** Every category that has at least one published article — used to
 * build the public category-filter control. Only categories with
 * published content are offered, so the filter never leads to an
 * empty result. */
export async function getPublicBlogCategories(): Promise<PublicBlogCategoryOption[]> {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED", categoryId: { not: null } },
    select: { category: { include: { translations: true } } },
  });

  const seen = new Map<string, PublicBlogCategoryOption>();
  for (const post of posts as {
    category: { slug: string; translations: { locale: string; name: string }[] } | null;
  }[]) {
    if (!post.category) continue;
    if (seen.has(post.category.slug)) continue;
    seen.set(post.category.slug, {
      slug: post.category.slug,
      name:
        post.category.translations.find((t) => t.locale === DEFAULT_LOCALE)?.name ??
        post.category.translations[0]?.name ??
        "",
    });
  }
  return Array.from(seen.values());
}

export interface PublicBlogPostDetail {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  featuredImageUrl: string | null;
  gallery: string[];
  categorySlug: string | null;
  categoryName: string | null;
  publishedAt: Date | null;
}

/** Returns the article only if it's published. Returns `null` for a
 * nonexistent OR unpublished (draft) slug — same "can't tell the
 * difference" contract every other public reader in this project
 * (Static Pages, Categories) already uses, so the caller renders a
 * single, safe `notFound()` for both cases. */
export async function getPublicBlogPostBySlug(slug: string): Promise<PublicBlogPostDetail | null> {
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: {
      translations: true,
      featuredMedia: { select: { url: true } },
      gallery: { select: { url: true } },
      category: { include: { translations: true } },
    },
  });

  if (!post || post.status !== "PUBLISHED") return null;

  return {
    id: post.id,
    slug: post.slug,
    title: resolveTitle(post.translations),
    excerpt: resolveExcerpt(post.translations),
    content: resolveContent(post.translations),
    featuredImageUrl: post.featuredMedia?.url ?? null,
    gallery: post.gallery.map((m: { url: string }) => m.url),
    categorySlug: post.category?.slug ?? null,
    categoryName: post.category
      ? post.category.translations.find((t: { locale: string; name: string }) => t.locale === DEFAULT_LOCALE)?.name ??
        post.category.translations[0]?.name ??
        null
      : null,
    publishedAt: post.publishedAt,
  };
}

/** Every currently published article's slug — used by
 * src/app/sitemap.ts so newly published articles are picked up
 * automatically and unpublished/deleted ones drop out, without
 * hand-maintaining a separate sitemap list. */
export async function getAllPublishedBlogSlugs(): Promise<string[]> {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });
  return posts.map((p: { slug: string }) => p.slug);
}

/** Other published articles in the same category (or, if the article
 * has no category, other recent published articles) — excludes the
 * current article itself. Used for the detail page's "related
 * articles" section. */
export async function getRelatedBlogPosts(
  currentSlug: string,
  categorySlug: string | null,
  limit = 3
): Promise<PublicBlogPostSummary[]> {
  const posts = await prisma.blogPost.findMany({
    where: {
      status: "PUBLISHED",
      slug: { not: currentSlug },
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    include: {
      translations: true,
      featuredMedia: { select: { url: true } },
      category: { include: { translations: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
    take: limit,
  });

  return posts.map(toSummary);
}
