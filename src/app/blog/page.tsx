import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Card } from "@/components/ui/Card";
import { getPublicBlogListing, getPublicBlogCategories } from "@/lib/blog-public-content";

/**
 * Public Blog listing — reuses the existing `BlogPost` model (via
 * src/lib/blog-public-content.ts, backed by the same admin service the
 * Blog CMS screen uses — no new model) and the exact same
 * SiteHeader/Card/gradient-hero-band template already established for
 * Static Pages and Categories, so it fits the existing visual
 * identity without redesigning anything.
 *
 * Category filtering (`?category=slug`), search (`?q=...`), and
 * pagination (`?page=N`) are all plain query params resolved
 * server-side against the database — no client-side state, no
 * hardcoded category or article list. Only published articles ever
 * appear; a draft or deleted article disappears automatically.
 */

export const metadata: Metadata = {
  title: "المدونة | مطلوب",
  description: "مقالات ونصائح مرتبطة بمنصة مطلوب.",
};

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
}

export default async function BlogListingPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}) {
  const { category, q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [listing, categories] = await Promise.all([
    getPublicBlogListing({ page, categorySlug: category, search: q }),
    getPublicBlogCategories(),
  ]);

  const totalPages = Math.max(1, Math.ceil(listing.total / listing.pageSize));

  function pageHref(targetPage: number, overrides?: { category?: string; q?: string }): string {
    const params = new URLSearchParams();
    const effectiveCategory = overrides?.category !== undefined ? overrides.category : category;
    const effectiveQ = overrides?.q !== undefined ? overrides.q : q;
    if (effectiveCategory) params.set("category", effectiveCategory);
    if (effectiveQ) params.set("q", effectiveQ);
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return `/blog${query ? `?${query}` : ""}`;
  }

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted pb-16">
      <div className="px-4 pt-10 sm:pt-16">
        <SiteHeader title="المدونة" />
      </div>

      <section className="px-4">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-card bg-gradient-to-br from-navy-950 to-teal-700 px-6 py-12 text-center shadow-card-lg sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -left-14 -top-14 h-52 w-52 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-8 h-52 w-52 rounded-full bg-teal-300/20 blur-3xl" />
          <div className="relative">
            <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">المدونة</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-teal-100 sm:text-base">
              مقالات ونصائح تساعدك تستفيد أكثر من مطلوب.
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 pt-8 sm:pt-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <form action="/blog" method="get" className="flex-1 min-w-[220px]">
              {category && <input type="hidden" name="category" value={category} />}
              <input
                type="text"
                name="q"
                defaultValue={q ?? ""}
                placeholder="بحث في المدونة..."
                className="w-full rounded-lg border border-border-strong px-4 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </form>
          </div>

          {categories.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              <Link
                href={pageHref(1, { category: "" })}
                className={`rounded-pill px-4 py-1.5 text-sm font-semibold transition ${
                  !category ? "bg-teal-600 text-white" : "bg-white text-text-500 hover:bg-teal-50"
                }`}
              >
                الكل
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={pageHref(1, { category: c.slug })}
                  className={`rounded-pill px-4 py-1.5 text-sm font-semibold transition ${
                    category === c.slug ? "bg-teal-600 text-white" : "bg-white text-text-500 hover:bg-teal-50"
                  }`}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}

          {listing.posts.length === 0 ? (
            <Card>
              <p className="text-center text-sm text-text-500">لا توجد مقالات مطابقة حالياً.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listing.posts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="block">
                  <Card padded={false} className="h-full overflow-hidden transition hover:shadow-card-lg">
                    <div className="aspect-video w-full bg-surface-muted">
                      {post.featuredImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.featuredImageUrl} alt={post.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-teal-600">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M4 4h16v16H4z" />
                            <path d="M4 15l4-4 4 4 4-6 4 4" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      {post.categoryName && (
                        <span className="mb-2 inline-block rounded-pill bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-700">
                          {post.categoryName}
                        </span>
                      )}
                      <h2 className="font-display text-base font-bold text-navy-950">{post.title}</h2>
                      {post.excerpt && <p className="mt-1 line-clamp-2 text-sm text-text-500">{post.excerpt}</p>}
                      {formatDate(post.publishedAt) && (
                        <p className="mt-3 text-xs text-text-400">{formatDate(post.publishedAt)}</p>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={pageHref(p)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition ${
                    p === page ? "bg-teal-600 text-white" : "bg-white text-text-500 hover:bg-teal-50"
                  }`}
                >
                  {p.toLocaleString("ar")}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
