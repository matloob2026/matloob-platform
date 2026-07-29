import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PublicPageContent } from "@/components/marketing/PublicPageContent";
import { PublicPageCta } from "@/components/marketing/PublicPageCta";
import { getPublicStaticPage } from "@/lib/static-page-public-content";
import { getPublicSiteContact } from "@/lib/site-settings-public";
import { resolveSeo, toMetadata } from "@/lib/seo";

/**
 * Public Static Pages route — Checkpoint 03, given a single unified
 * professional template in Checkpoint 06 (the final Static Pages /
 * Public Pages CMS task). Loads an owner-authored page (About, Terms,
 * Privacy, Contact, ...) by slug from the database (see
 * src/lib/static-page-public-content.ts, backed by the existing
 * `PageContent` model — no new model).
 *
 * TEMPLATE: every static page — existing or newly created through the
 * Admin CMS — renders through this SAME template automatically:
 *   1. Header — the existing `SiteHeader` (same chrome as Create
 *      Request/Profile/My Requests), unchanged.
 *   2. Hero band — a rounded, gradient navy/teal panel (the exact
 *      brand tokens the homepage itself is built from — see
 *      tailwind.config.ts's comment: "ported directly from the locked
 *      homepage design") carrying the page title and an auto-derived
 *      lead line, so the admin never has to write a "subtitle" field.
 *   3. Content panel — the admin's plain-text content run through
 *      `PublicPageContent`, which formats it into paragraphs/
 *      headings/lists automatically (no HTML/markup entry required).
 *   4. CTA — the shared `PublicPageCta`, identical on every page.
 * The admin only ever enters title + content; the visual quality
 * comes from this template, not from anything they have to build.
 *
 * A missing OR inactive page both render the same `notFound()` 404 —
 * `getPublicStaticPage` returns `null` for either case, so a visitor
 * can never tell the difference between "never existed" and
 * "temporarily unpublished".
 *
 * SETTINGS/SEO CMS task: `generateMetadata` now resolves through the
 * one shared strategy (src/lib/seo.ts) — page-specific SEO
 * (`SeoSetting(entityType: "static_page", entityId: slug)`, editable
 * from this page's own Admin form — see StaticPagesManager.tsx) →
 * global SEO defaults → this page's own real title/lead as a safe
 * fallback. The "contact" slug additionally renders a small, live
 * contact-details block sourced from Admin → Settings → التواصل (see
 * getPublicSiteContact) — every other slug is unaffected.
 */

const DEFAULT_LOCALE: "ar" | "en" = "ar";
const LEAD_MAX_LENGTH = 160;

/** A short, auto-derived intro line for the hero band — never
 * persisted, never authored separately; just the first readable line
 * of the admin's own content, so "optional short subtitle" comes for
 * free without a new field. */
function deriveLead(content: string): string | null {
  const firstBlock = content.split(/\n{2,}/).map((b) => b.trim()).find(Boolean);
  if (!firstBlock) return null;
  const firstLine = firstBlock
    .split("\n")[0]!
    .replace(/^#{1,2}\s+/, "")
    .replace(/^[-*]\s+/, "")
    .trim();
  if (!firstLine) return null;
  return firstLine.length > LEAD_MAX_LENGTH ? `${firstLine.slice(0, LEAD_MAX_LENGTH).trimEnd()}…` : firstLine;
}

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
  const content = DEFAULT_LOCALE === "ar" ? page.contentAr : page.contentEn;
  const resolved = await resolveSeo("static_page", slug, DEFAULT_LOCALE, {
    title: `${title} | مطلوب`,
    description: deriveLead(content) ?? title,
  });
  return toMetadata(resolved);
}

export default async function StaticPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPublicStaticPage(slug);

  if (!page) {
    notFound();
  }

  const title = DEFAULT_LOCALE === "ar" ? page.titleAr : page.titleEn;
  const content = DEFAULT_LOCALE === "ar" ? page.contentAr : page.contentEn;
  const lead = deriveLead(content);
  // SETTINGS CMS task: the "Contact" page additionally shows a small,
  // live contact-details block sourced from Admin → Settings →
  // التواصل, so an admin can update the platform's contact info in one
  // place without editing this page's CMS content by hand. Any other
  // slug just skips this — no visual change elsewhere.
  const contact = slug === "contact" ? await getPublicSiteContact() : null;
  const hasContactDetails =
    contact && (contact.contactEmail || contact.supportEmail || contact.contactPhone || contact.whatsappNumber || contact.address);

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted pb-16">
      <div className="px-4 pt-10 sm:pt-16">
        <SiteHeader title={title} />
      </div>

      <section className="px-4">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-card bg-gradient-to-br from-navy-950 to-teal-700 px-6 py-12 text-center shadow-card-lg sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -left-14 -top-14 h-52 w-52 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-8 h-52 w-52 rounded-full bg-teal-300/20 blur-3xl" />
          <div className="relative">
            <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">{title}</h1>
            {lead && (
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-teal-100 sm:text-base">{lead}</p>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 pt-8 sm:pt-10">
        <div className="mx-auto max-w-3xl rounded-card bg-white p-6 shadow-card sm:p-10">
          {page.featuredImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={page.featuredImageUrl}
              alt={title}
              className="mb-6 max-h-80 w-full rounded-lg object-cover"
            />
          )}
          <PublicPageContent text={content} />

          {hasContactDetails && contact && (
            <div className="mt-8 grid gap-3 border-t border-border pt-6 text-sm text-text-700 sm:grid-cols-2">
              {contact.contactEmail && (
                <p>
                  <span className="font-bold text-navy-950">البريد الإلكتروني: </span>
                  <a href={`mailto:${contact.contactEmail}`} className="text-teal-600 hover:underline" dir="ltr">
                    {contact.contactEmail}
                  </a>
                </p>
              )}
              {contact.supportEmail && (
                <p>
                  <span className="font-bold text-navy-950">بريد الدعم الفني: </span>
                  <a href={`mailto:${contact.supportEmail}`} className="text-teal-600 hover:underline" dir="ltr">
                    {contact.supportEmail}
                  </a>
                </p>
              )}
              {contact.contactPhone && (
                <p>
                  <span className="font-bold text-navy-950">الهاتف: </span>
                  <a href={`tel:${contact.contactPhone}`} className="text-teal-600 hover:underline" dir="ltr">
                    {contact.contactPhone}
                  </a>
                </p>
              )}
              {contact.whatsappNumber && (
                <p>
                  <span className="font-bold text-navy-950">واتساب: </span>
                  <a
                    href={`https://wa.me/${contact.whatsappNumber.replace(/[^0-9]/g, "")}`}
                    className="text-teal-600 hover:underline"
                    dir="ltr"
                  >
                    {contact.whatsappNumber}
                  </a>
                </p>
              )}
              {contact.address && (
                <p className="sm:col-span-2">
                  <span className="font-bold text-navy-950">العنوان: </span>
                  {contact.address}
                </p>
              )}
            </div>
          )}

          <PublicPageCta />
        </div>
      </section>
    </main>
  );
}
