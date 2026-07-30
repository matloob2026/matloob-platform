import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Card } from "@/components/ui/Card";
import { getPublicCategories } from "@/lib/category-public-content";

/**
 * Public Categories listing — the Categories module's missing public
 * page. Reuses the existing `Category`/`CategoryTranslation` model
 * (via src/lib/category-public-content.ts, backed by the same admin
 * service Checkpoint 01 built — no new model) and the same
 * SiteHeader/Card page-shell conventions as Create Request/Profile/
 * Static Pages, so it fits the existing visual identity without
 * redesigning anything.
 *
 * This is a SEPARATE route from the homepage's own static categories
 * section (src/content/marketing/homepage-body.html) — that section's
 * public visual design was explicitly out of scope for the Categories
 * CMS and stays untouched. This page is the first REAL, database-
 * backed public category browsing surface.
 *
 * Only active, top-level categories are listed — inactive categories
 * and their subcategories never appear here, matching how
 * src/lib/request-form-options.ts already filters the Create Request
 * form's category dropdown.
 */

export const metadata: Metadata = {
  title: "التصنيفات | مطلوب",
  description: "تصفح كل تصنيفات الطلبات المتاحة على منصة مطلوب.",
};

export default async function CategoriesPage() {
  const categories = await getPublicCategories();

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted pb-16">
      <div className="px-4 pt-10 sm:pt-16">
        <SiteHeader title="التصنيفات" />
      </div>

      <section className="px-4">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-card bg-gradient-to-br from-navy-950 to-teal-700 px-6 py-12 text-center shadow-card-lg sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -left-14 -top-14 h-52 w-52 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-8 h-52 w-52 rounded-full bg-teal-300/20 blur-3xl" />
          <div className="relative">
            <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">التصنيفات</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-teal-100 sm:text-base">
              اختر التصنيف المناسب لطلبك، أو تصفّح كل ما يقدر مطلوب يوفره لك.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 pt-8 sm:pt-10">
        <div className="mx-auto max-w-5xl">
          {categories.length === 0 ? (
            <Card>
              <p className="text-center text-sm text-text-500">لا توجد تصنيفات متاحة حالياً.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <Link key={category.slug} href={`/categories/${category.slug}`} className="block">
                  <Card className="h-full transition hover:shadow-card-lg">
                    <div className="flex items-start gap-3">
                      {category.imageUrl || category.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={category.imageUrl ?? category.iconUrl ?? undefined}
                          alt=""
                          className="h-11 w-11 flex-shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-lg font-extrabold text-white"
                          style={{ backgroundColor: category.colorHex ?? "#0f766e" }}
                        >
                          {category.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2 className="font-display text-base font-bold text-navy-950">{category.name}</h2>
                        {category.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-text-500">{category.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3 border-t border-border pt-3 text-xs text-text-400">
                      <span>{category.requestCount.toLocaleString("ar")} طلب</span>
                      {category.childCount > 0 && (
                        <span>· {category.childCount.toLocaleString("ar")} تصنيف فرعي</span>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
