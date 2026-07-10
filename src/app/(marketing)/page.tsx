import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import "@/styles/marketing.css";
import { LegacyHomepageScripts } from "@/components/marketing/LegacyHomepageScripts";

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
 * When Phase 3+ rebuilds this as real React components (per the
 * src/components/hero, src/components/requests folders reserved in
 * Phase 1), this file is what gets replaced — nothing else in the app
 * depends on its internals.
 */
export default function HomePage() {
  const bodyHtml = fs.readFileSync(
    path.join(process.cwd(), "src/content/marketing/homepage-body.html"),
    "utf-8"
  );

  return (
    <>
      <div className="matloob-marketing-root" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <LegacyHomepageScripts />
    </>
  );
}
