/**
 * Read-only category content for the public site
 * (src/app/categories/page.tsx and src/app/categories/[slug]/page.tsx).
 *
 * Mirrors src/lib/homepage-public-content.ts / static-page-public-content.ts:
 * a thin, page-scoped data loader (not the Admin CRUD service) reading
 * the SAME `Category`/`CategoryTranslation` models
 * src/services/admin/category.service.ts manages. No auth requirement
 * — this is read by public pages — and every function here only ever
 * returns active categories, matching how
 * src/lib/request-form-options.ts already filters the Create Request
 * form's category dropdown (`where: { isActive: true }`).
 *
 * These are NEW routes, separate from the homepage's own static
 * categories section (src/content/marketing/homepage-body.html's
 * `<section class="categories">`), which stays exactly as designed —
 * per this project's established rule, only the management
 * functionality was ever in scope for that section, not its public
 * visual design.
 */

import { prisma } from "@/lib/prisma";
import type { Locale } from "@/types/domain";

const DEFAULT_LOCALE: Locale = "ar";

interface TranslationRow {
  locale: string;
  name: string;
  description: string | null;
}

function resolveName(translations: TranslationRow[]): string {
  return (
    translations.find((t) => t.locale === DEFAULT_LOCALE)?.name ?? translations[0]?.name ?? ""
  );
}

function resolveDescription(translations: TranslationRow[]): string | null {
  return (
    translations.find((t) => t.locale === DEFAULT_LOCALE)?.description ??
    translations[0]?.description ??
    null
  );
}

export interface PublicCategorySummary {
  slug: string;
  name: string;
  description: string | null;
  colorHex: string | null;
  iconUrl: string | null;
  imageUrl: string | null;
  /** Count of non-deleted requests directly in this category (not
   * including its children's requests) — same counting rule as the
   * Admin screen's `requestCount` (see category.service.ts). */
  requestCount: number;
  childCount: number;
}

/** All active, top-level (no parent) categories, ordered the same way
 * the Admin screen and the Create Request dropdown already order them
 * (`sortOrder` then creation order). Returns `[]` when none exist yet
 * — the caller then shows an empty state rather than erroring. */
export async function getPublicCategories(): Promise<PublicCategorySummary[]> {
  const categories = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    include: {
      translations: true,
      icon: { select: { url: true } },
      image: { select: { url: true } },
      _count: {
        select: {
          requests: { where: { deletedAt: null } },
          children: { where: { isActive: true } },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return categories.map(
    (c: {
      slug: string;
      colorHex: string | null;
      translations: TranslationRow[];
      icon: { url: string } | null;
      image: { url: string } | null;
      _count: { requests: number; children: number };
    }) => ({
      slug: c.slug,
      name: resolveName(c.translations),
      description: resolveDescription(c.translations),
      colorHex: c.colorHex,
      iconUrl: c.icon?.url ?? null,
      imageUrl: c.image?.url ?? null,
      requestCount: c._count.requests,
      childCount: c._count.children,
    })
  );
}

export interface PublicCategoryChild {
  slug: string;
  name: string;
  iconUrl: string | null;
  requestCount: number;
}

export interface PublicCategoryDetail {
  slug: string;
  name: string;
  description: string | null;
  colorHex: string | null;
  iconUrl: string | null;
  imageUrl: string | null;
  requestCount: number;
  parent: { slug: string; name: string } | null;
  children: PublicCategoryChild[];
}

/** Returns the category only if it's active. Returns `null` for a
 * nonexistent OR inactive slug — same "can't tell the difference"
 * contract src/lib/static-page-public-content.ts's
 * `getPublicStaticPage` already uses, so the caller renders a single,
 * safe `notFound()` for both cases. */
export async function getPublicCategoryBySlug(slug: string): Promise<PublicCategoryDetail | null> {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      translations: true,
      icon: { select: { url: true } },
      image: { select: { url: true } },
      parent: { include: { translations: true } },
      children: {
        where: { isActive: true },
        include: {
          translations: true,
          icon: { select: { url: true } },
          _count: { select: { requests: { where: { deletedAt: null } } } },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      _count: { select: { requests: { where: { deletedAt: null } } } },
    },
  });

  if (!category || !category.isActive) return null;

  return {
    slug: category.slug,
    name: resolveName(category.translations),
    description: resolveDescription(category.translations),
    colorHex: category.colorHex,
    iconUrl: category.icon?.url ?? null,
    imageUrl: category.image?.url ?? null,
    requestCount: category._count.requests,
    parent: category.parent
      ? { slug: category.parent.slug, name: resolveName(category.parent.translations) }
      : null,
    children: category.children.map(
      (child: {
        slug: string;
        translations: TranslationRow[];
        icon: { url: string } | null;
        _count: { requests: number };
      }) => ({
        slug: child.slug,
        name: resolveName(child.translations),
        iconUrl: child.icon?.url ?? null,
        requestCount: child._count.requests,
      })
    ),
  };
}
