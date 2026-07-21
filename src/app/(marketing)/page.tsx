import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import "@/styles/marketing.css";
import { LegacyHomepageScripts } from "@/components/marketing/LegacyHomepageScripts";
import { HomepageAuthNav } from "@/components/marketing/HomepageAuthNav";
import {
  getPublicHomepageMainContent,
  getPublicHomepageStats,
  getPublicHomepageTrustBadges,
} from "@/lib/homepage-public-content";
import {
  getPublicStaticPageFooterNavLinks,
  getPublicStaticPageMainNavLinks,
} from "@/lib/static-page-public-content";
import { renderHomepageHtml } from "./homepage-render";

export const metadata: Metadata = {
  title: "مطلوب | قولنا إيه اللي محتاجه",
  description: "منصة الطلبات الأولى في المملكة — بدل ما تدور... اطلبها وبكل سهولة تجيلك!",
};

/**
 * This page renders the EXACT markup from the locked homepage design
 * (see docs/ARCHITECTURE.md — "Phase 1 deliberately does not include
 * ... no actual Next.js pages/components"). The design phase's output
 * was a single static HTML file; that file's <body> content is stored
 * verbatim in src/content/marketing/homepage-body.html and read here
 * rather than hand-transcribed into JSX, to guarantee zero visual
 * drift from the approved design.
 *
 * Styling: src/styles/marketing.css is the same file's <style> block,
 * scoped under `.matloob-marketing-root` (via postcss-prefix-selector
 * at authoring time) so it cannot leak into /admin's Tailwind styles —
 * see the comment in that file's build note. Behavior (mobile menu,
 * reveal-on-scroll, stat counters, hero placeholder rotation) is
 * restored by <LegacyHomepageScripts />, which runs the same vanilla
 * JS the static file shipped with.
 *
 * CMS Checkpoint 02: the hero headline/subtitle/CTA, the stats strip,
 * and the trust badges are no longer purely hardcoded — see
 * ./homepage-render.ts, which injects database-backed content (loaded
 * via src/lib/homepage-public-content.ts) between marker comments in
 * the static HTML. When nothing has been saved in the Admin CMS yet,
 * every one of those reads returns null/[] and the original static
 * content renders completely untouched — see homepage-render.ts's
 * docstring for the exact guarantee. The Hero section's image collage
 * and the rest of the page (categories grid, footer links, etc.)
 * remain exactly as before; only these three CMS-managed pieces can
 * change source.
 *
 * CMS Checkpoint 04: the footer's "Legal" links column also lists any
 * currently-published Static Page (see
 * src/lib/static-page-public-content.ts /
 * src/services/admin/static-page.service.ts) instead of its two
 * hardcoded placeholder links — again with the same safe fallback: if
 * no static page is published yet, the original placeholders remain.
 *
 * CMS Checkpoint 05: each Static Page now also has an admin-controlled
 * navigation placement — "main nav", "footer", "both", or "neither"
 * (see `NavPlacement` in static-page.service.ts, stored in
 * `PageContent.extra`, no schema change). Pages placed in "main nav"
 * are appended after the header's existing hardcoded links (desktop
 * and mobile) without replacing or duplicating them; pages placed in
 * "footer" populate the footer list from Checkpoint 04. A page can
 * appear in both, either, or neither location while still being
 * reachable at its direct `/pages/[slug]` URL.
 *
 * When Phase 3+ rebuilds this as real React components (per the
 * src/components/hero, src/components/requests folders reserved in
 * Phase 1), this file is what gets replaced — nothing else in the app
 * depends on its internals.
 */
export default async function HomePage() {
  const rawHtml = fs.readFileSync(
    path.join(process.cwd(), "src/content/marketing/homepage-body.html"),
    "utf-8"
  );

  const [main, stats, trustBadges, footerStaticPageNavLinks, mainNavStaticPageLinks] = await Promise.all([
    getPublicHomepageMainContent(),
    getPublicHomepageStats(),
    getPublicHomepageTrustBadges(),
    getPublicStaticPageFooterNavLinks(),
    getPublicStaticPageMainNavLinks(),
  ]);

  const bodyHtml = renderHomepageHtml(rawHtml, {
    main,
    stats,
    trustBadges,
    footerStaticPageNavLinks,
    mainNavStaticPageLinks,
  });

  return (
    <>
      <div className="matloob-marketing-root" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <LegacyHomepageScripts />
      <HomepageAuthNav />
    </>
  );
}
