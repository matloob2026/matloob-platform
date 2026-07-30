import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Card } from "@/components/ui/Card";
import { getPublicCategoryBySlug } from "@/lib/category-public-content";

/**
 * Public Category detail page — the Categories module's other missing
 * public page. Reuses the existing `Category` model (via
 * src/lib/category-public-content.ts) and the same unified public-page
 * template style as Static Pages (src/app/pages/[slug]/page.tsx):
 * SiteHeader + gradient hero band + content card.
 *
 * A missing OR inactive slug both render the same `notFound()` 404 —
 * `getPublicCategoryBySlug` returns `null` for either case, matching
 * the same contract Static Pages already use.
 *
 * The "Add your request" CTA links to the existing Create Request flow
 * with `?category=<name>` — the EXACT query param
 * src/app/(marketing)/create-request/page.tsx already reads (matching
 * by category NAME, not slug — see that file's own comment on the
 * homepage hero search bar hand-off). No changes were made to Requests
 * or the Create Request page itself; this only links to what already
 * exists there.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getPublicCategoryBySlug(slug);
  if (!category) {
    return { title: "التصنيف غير موجود | مطلوب" };
  }
  return { title: `${category.name} | مطلوب`, description: category.description ?? undefined };
}

export default async function CategoryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = await getPublicCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const createRequestHref = `/create-request?category=${encodeURIComponent(category.name)}`;

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted pb-16">
      <div className="px-4 pt-10 sm:pt-16">
        <SiteHeader title={category.name} />
      </div>

      <section className="px-4">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-card bg-gradient-to-br from-navy-950 to-teal-700 px-6 py-12 text-center shadow-card-lg sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -left-14 -top-14 h-52 w-52 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-8 h-52 w-52 rounded-full bg-teal-300/20 blur-3xl" />
          <div className="relative">
            {category.parent && (
              <p className="mb-2 text-xs text-teal-100">
                <Link href={`/categories/${category.parent.slug}`} className="hover:underline">
                  {category.parent.name}
                </Link>
                <span> / {category.name}</span>
              </p>
            )}
            <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">{category.name}</h1>
            {category.description && (
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-teal-100 sm:text-base">
                {category.description}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 pt-8 sm:pt-10">
        <div className="mx-auto max-w-3xl rounded-card bg-white p-6 shadow-card sm:p-10">
          {(category.imageUrl || category.iconUrl) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={category.imageUrl ?? category.iconUrl ?? undefined}
              alt={category.name}
              className="mb-6 max-h-72 w-full rounded-lg object-cover"
            />
          )}
          <p className="text-sm text-text-500">
            {category.requestCount.toLocaleString("ar")} طلب منشور في هذا التصنيف حالياً.
          </p>

          {category.children.length > 0 && (
            <div className="mt-8 border-t border-border pt-6">
              <h2 className="font-display text-lg font-bold text-navy-950">التصنيفات الفرعية</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {category.children.map((child) => (
                  <Link key={child.slug} href={`/categories/${child.slug}`} className="block">
                    <div className="flex items-center gap-3 rounded-lg border border-border p-3 transition hover:border-teal-300 hover:bg-teal-50/50">
                      {child.imageUrl || child.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={child.imageUrl ?? child.iconUrl ?? undefined} alt="" className="h-9 w-9 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-teal-100 text-sm font-bold text-teal-700">
                          {child.name.slice(0, 1)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-navy-950">{child.name}</p>
                        <p className="text-xs text-text-400">{child.requestCount.toLocaleString("ar")} طلب</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="relative mt-10 overflow-hidden rounded-card bg-gradient-to-br from-navy-950 to-teal-700 px-6 py-10 text-center shadow-card-lg sm:px-10 sm:py-12">
            <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-teal-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-teal-300/20 blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-xl font-extrabold text-white sm:text-2xl">
                محتاج {category.name}؟ اطلبها الآن
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-teal-100 sm:text-base">
                انشر طلبك مجاناً في هذا التصنيف وخلي الموردين المناسبين يوصلولك بعروضهم.
              </p>
              <Link
                href={createRequestHref}
                className="mt-6 inline-flex items-center justify-center rounded-pill bg-white px-7 py-3 text-sm font-bold text-navy-950 shadow-card transition hover:bg-teal-50 sm:text-base"
              >
                أضف طلبك الآن
              </Link>
            </div>
          </div>

          <Card className="mt-6">
            <Link href="/categories" className="text-sm font-semibold text-teal-600 hover:underline">
              ← كل التصنيفات
            </Link>
          </Card>
        </div>
      </section>
    </main>
  );
}
