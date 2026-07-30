import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PublicPageContent } from "@/components/marketing/PublicPageContent";
import {
  getPublicBlogPostBySlug,
  getRelatedBlogPosts,
} from "@/lib/blog-public-content";
import { resolveSeo, toMetadata } from "@/lib/seo";

/**
 * Public Blog article detail — reuses the existing `BlogPost` model
 * (via src/lib/blog-public-content.ts), the same unified public-page
 * template style as Static Pages/Categories (SiteHeader + gradient
 * hero band + content card), and the EXACT SAME content formatter
 * already built for Static Pages (`PublicPageContent` — paragraphs/
 * headings/lists from plain text, no HTML/markup required from the
 * admin, no second "rich text renderer").
 *
 * SEO reuses the one shared 3-tier resolution strategy
 * (page-specific → global → fallback — see src/lib/seo.ts), keyed by
 * `entityType: "blog_post"`, `entityId: post.id` — the SAME id the
 * Admin Blog form's SEO section already saves against (see
 * BlogManager.tsx). Not a new SEO system.
 *
 * A missing OR unpublished (draft) slug both render the same
 * `notFound()` 404 — `getPublicBlogPostBySlug` returns `null` for
 * either case, matching the same contract every other public reader
 * in this project (Static Pages, Categories) already uses.
 */

const FALLBACK_LOCALE = "ar" as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicBlogPostBySlug(slug);
  if (!post) {
    return { title: "المقال غير موجود | مطلوب" };
  }
  const resolved = await resolveSeo("blog_post", post.id, FALLBACK_LOCALE, {
    title: `${post.title} | مطلوب`,
    description: post.excerpt ?? post.title,
  });
  return toMetadata(resolved);
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublicBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const related = await getRelatedBlogPosts(post.slug, post.categorySlug);

  const publishedLabel = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted pb-16">
      <div className="px-4 pt-10 sm:pt-16">
        <SiteHeader title={post.title} />
      </div>

      {/* Breadcrumbs */}
      <nav className="px-4" aria-label="مسار التصفح">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-1.5 text-xs text-text-400">
          <Link href="/" className="hover:text-teal-600 hover:underline">
            الرئيسية
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-teal-600 hover:underline">
            المدونة
          </Link>
          {post.categoryName && post.categorySlug && (
            <>
              <span>/</span>
              <Link href={`/blog?category=${post.categorySlug}`} className="hover:text-teal-600 hover:underline">
                {post.categoryName}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-text-500">{post.title}</span>
        </div>
      </nav>

      <section className="px-4 pt-4">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-card bg-gradient-to-br from-navy-950 to-teal-700 px-6 py-12 text-center shadow-card-lg sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -left-14 -top-14 h-52 w-52 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-8 h-52 w-52 rounded-full bg-teal-300/20 blur-3xl" />
          <div className="relative">
            {post.categoryName && (
              <span className="mb-3 inline-block rounded-pill bg-white/15 px-3 py-1 text-xs font-bold text-white">
                {post.categoryName}
              </span>
            )}
            <h1 className="font-display text-2xl font-extrabold text-white sm:text-4xl">{post.title}</h1>
            {post.excerpt && (
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-teal-100 sm:text-base">
                {post.excerpt}
              </p>
            )}
            {publishedLabel && <p className="mt-4 text-xs text-teal-200">{publishedLabel}</p>}
          </div>
        </div>
      </section>

      <section className="px-4 pt-8 sm:pt-10">
        <div className="mx-auto max-w-3xl rounded-card bg-white p-6 shadow-card sm:p-10">
          {post.featuredImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.featuredImageUrl}
              alt={post.title}
              className="mb-6 max-h-96 w-full rounded-lg object-cover"
            />
          )}

          <PublicPageContent text={post.content} />

          {post.gallery.length > 0 && (
            <div className="mt-8 border-t border-border pt-6">
              <h2 className="mb-3 font-display text-base font-bold text-navy-950">معرض الصور</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {post.gallery.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" className="aspect-square w-full rounded-lg object-cover" />
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-border pt-4">
            <Link href="/blog" className="text-sm font-semibold text-teal-600 hover:underline">
              ← كل المقالات
            </Link>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="px-4 pt-8 sm:pt-10">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-4 font-display text-lg font-bold text-navy-950">مقالات ذات صلة</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {related.map((item) => (
                <Link key={item.slug} href={`/blog/${item.slug}`} className="block">
                  <div className="overflow-hidden rounded-card border border-border bg-white shadow-card transition hover:shadow-card-lg">
                    <div className="aspect-video w-full bg-surface-muted">
                      {item.featuredImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.featuredImageUrl} alt={item.title} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-bold text-navy-950">{item.title}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
