import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getPublicStaticPage } from "@/lib/static-page-public-content";

/**
 * Public Static Pages route — Checkpoint 03. Loads an owner-authored
 * page (About, Terms, Privacy, Contact, ...) by slug from the
 * database (see src/lib/static-page-public-content.ts, backed by the
 * existing `PageContent` model — no new model). Uses the SAME site
 * chrome (`SiteHeader`) and page-shell conventions as the other real
 * Next.js pages in this app (Create Request, Profile, My Requests) —
 * see src/app/(marketing)/profile/page.tsx — so this preserves the
 * existing Matloob visual identity rather than introducing a new
 * layout style. The homepage itself is a separate, locked static-HTML
 * page (see src/app/(marketing)/page.tsx) and is untouched by this
 * route.
 *
 * A missing OR inactive page both render the same `notFound()` 404 —
 * `getPublicStaticPage` returns `null` for either case, so a visitor
 * can never tell the difference between "never existed" and
 * "temporarily unpublished".
 */

const DEFAULT_LOCALE: "ar" | "en" = "ar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicStaticPage(slug);
  if (!page) {
    return { title: "الصفحة غير موجودة | مطلوب" };
  }
  const title = DEFAULT_LOCALE === "ar" ? page.titleAr : page.titleEn;
  return { title: `${title} | مطلوب` };
}

export default async function StaticPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublicStaticPage(slug);

  if (!page) {
    notFound();
  }

  const title = DEFAULT_LOCALE === "ar" ? page.titleAr : page.titleEn;
  const content = DEFAULT_LOCALE === "ar" ? page.contentAr : page.contentEn;
  const paragraphs = content.split("\n").filter((line) => line.trim().length > 0);

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <SiteHeader title={title} />
      <Card className="mx-auto max-w-2xl">
        <h1 className="font-display text-2xl font-extrabold text-navy-950 sm:text-3xl">{title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-text-700 sm:text-base">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </Card>
    </main>
  );
}
