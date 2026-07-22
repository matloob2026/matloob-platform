/**
 * Injects CMS-managed content into the locked homepage's static HTML
 * (src/content/marketing/homepage-body.html) between the invisible
 * `<!--CMS:...-->` marker comments added for Checkpoint 02 (and
 * Checkpoint 04's addition of `<!--CMS:STATIC_PAGES_NAV_...-->` for the
 * footer's legal links).
 *
 * WHY marker comments instead of rewriting the page as JSX: the
 * homepage's design is deliberately preserved verbatim (see the
 * docstring in src/app/(marketing)/page.tsx) via
 * `dangerouslySetInnerHTML`. Comments are invisible and don't nest
 * ambiguously the way matching `<div>` tags would with a naive regex,
 * so they're a safe, minimal way to make specific fields dynamic
 * without touching markup, classes, or visual output.
 *
 * SAFE-FALLBACK GUARANTEE: every `replaceBetweenMarkers` call (and
 * every inline `.replace(...)` below) is a no-op if its markers aren't
 * found (e.g. a future edit removes them) — the original hardcoded
 * block simply stays. And every caller below only replaces a section
 * when real CMS content was actually loaded; when
 * `getPublicHomepageMainContent`/`getPublicHomepageStats`/
 * `getPublicHomepageTrustBadges`/`getPublicStaticPageFooterNavLinks`/
 * `getPublicStaticPageMainNavLinks`/`getActiveKnownPageSlugs` return
 * null/[]/an empty set (nothing saved / no active pages yet), this
 * file does nothing for that section at all, so the exact original
 * static content between its markers (or, for the known-placeholder
 * links, the exact original `href="#"`) renders untouched — "must
 * continue looking and working exactly as it does now unless a
 * dynamic content change is made from the Admin CMS" holds by
 * construction.
 */

import type { PublicHomepageMainContent, PublicHomepageStat, PublicTrustBadge } from "@/lib/homepage-public-content";
import type { PublicStaticPageNavLink } from "@/lib/static-page-public-content";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Converts admin-entered plain-text line breaks into `<br>` so a
 * multi-line subtitle still wraps the way the original hardcoded
 * (`<br>`-separated) copy did, without allowing arbitrary HTML input. */
function escapeWithLineBreaks(value: string): string {
  return value.split("\n").map(escapeHtml).join("<br>");
}

function replaceBetweenMarkers(html: string, startMarker: string, endMarker: string, replacement: string): string {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    // Markers missing or malformed — leave the original content as-is
    // rather than risk corrupting the page.
    return html;
  }
  const before = html.slice(0, start + startMarker.length);
  const after = html.slice(end);
  return before + replacement + after;
}

// Known icon SVGs for the platform's original 4 stats / 2 trust badges —
// copied verbatim from the pre-Checkpoint-02 static markup so editing a
// VALUE or LABEL through the CMS doesn't change its icon. A stat/badge
// added later through the Admin CMS (no media management this
// checkpoint) gets a neutral fallback icon instead of no icon at all.
const STAT_ICONS: Record<string, string> = {
  "طلب منشور":
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 17H5a2 2 0 01-2-2V5a2 2 0 012-2h9a2 2 0 012 2v4M9 21h9a2 2 0 002-2V9"/></svg>',
  "عضو نشط":
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
  "طلب تم تنفيذه":
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>',
  "طلبات جديدة اليوم":
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
};
const STAT_ICON_FALLBACK =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.4 7.4H22l-6 4.3 2.3 7.3-6.3-4.5-6.3 4.5 2.3-7.3-6-4.3h7.6z"/></svg>';

const TRUST_BADGE_ICONS: Record<string, string> = {
  "دفع وتواصل آمن":
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
  "دعم فني 24/7":
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
};
const TRUST_BADGE_ICON_FALLBACK =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>';

/**
 * CMS Checkpoint 06 (final task) — the site's existing hardcoded
 * placeholder links (main nav, mobile nav, and the footer's
 * "الشركة"/"الدعم" columns — "قانوني" is handled separately by the
 * dynamic footerStaticPageNavLinks mechanism above). Every one of
 * these labels already exists verbatim in homepage-body.html with
 * `href="#"`. Once the corresponding Static Page is created AND
 * published (see getActiveKnownPageSlugs in
 * src/lib/static-page-public-content.ts), that placeholder's `href` —
 * and ONLY the href, never the label text or the surrounding markup —
 * is pointed at the real `/pages/{slug}`. A label with no matching
 * published page is left exactly as `href="#"` (safe fallback — "Do
 * not leave placeholder links" is satisfied progressively, as each
 * page gets created, without ever breaking the page in the meantime).
 *
 * "المدونة" (Blog) is deliberately NOT in this map — it stays a
 * separate, not-yet-built system and must not be converted into a
 * Static Page.
 */
const KNOWN_LINK_LABEL_TO_SLUG: Record<string, string> = {
  "تواصل معنا": "contact",
  "كيف يعمل مطلوب": "how-it-works",
  "من نحن": "about",
  "الشروط والأحكام": "terms",
  "سياسة الخصوصية": "privacy",
  "الأسئلة الشائعة": "faq",
  "مركز المساعدة": "help-center",
};

function fixKnownPlaceholderLinks(html: string, activeKnownPageSlugs: ReadonlySet<string>): string {
  let result = html;
  for (const [label, slug] of Object.entries(KNOWN_LINK_LABEL_TO_SLUG)) {
    if (!activeKnownPageSlugs.has(slug)) continue;
    // Matches this exact label wherever it appears as a placeholder
    // link (main nav, mobile nav, footer columns) — every occurrence
    // of the same label is the same destination, so replacing all of
    // them is correct here, not a duplication risk.
    const pattern = new RegExp(`href="#">${label}<`, "g");
    result = result.replace(pattern, `href="/pages/${slug}">${label}<`);
  }
  return result;
}

export function renderHomepageHtml(
  bodyHtml: string,
  content: {
    main: PublicHomepageMainContent | null;
    stats: PublicHomepageStat[];
    trustBadges: PublicTrustBadge[];
    footerStaticPageNavLinks: PublicStaticPageNavLink[];
    mainNavStaticPageLinks: PublicStaticPageNavLink[];
    activeKnownPageSlugs: ReadonlySet<string>;
  }
): string {
  let html = bodyHtml;

  if (content.main) {
    html = replaceBetweenMarkers(
      html,
      "<!--CMS:HERO_HEADING_START-->",
      "<!--CMS:HERO_HEADING_END-->",
      escapeHtml(content.main.heading)
    );
    html = replaceBetweenMarkers(
      html,
      "<!--CMS:HERO_SUB_START-->",
      "<!--CMS:HERO_SUB_END-->",
      escapeWithLineBreaks(content.main.body)
    );
    // Rebuilds the whole anchor (not just its text) since the CTA's
    // destination (href) is admin-editable too, not just its label.
    const ctaHtml = `<a href="${escapeHtml(content.main.ctaUrl)}" class="btn btn-lg cta-desktop-only">${escapeHtml(
      content.main.ctaLabel
    )}</a>`;
    html = html.replace(
      /<!--CMS:CTA_START-->[\s\S]*?<!--CMS:CTA_END-->/,
      `<!--CMS:CTA_START-->${ctaHtml}<!--CMS:CTA_END-->`
    );
  }

  if (content.stats.length > 0) {
    const statsHtml = content.stats
      .map((stat) => {
        const icon = STAT_ICONS[stat.label] ?? STAT_ICON_FALLBACK;
        return (
          `<div class="stat"><span class="stat-icon">${icon}</span>` +
          `<div><div class="stat-num" data-count="${stat.value}">0</div>` +
          `<div class="stat-label">${escapeHtml(stat.label)}</div></div></div>`
        );
      })
      .join("");
    html = html.replace(/<!--CMS:STATS_START-->[\s\S]*?<!--CMS:STATS_END-->/, `<!--CMS:STATS_START-->${statsHtml}<!--CMS:STATS_END-->`);
  }

  if (content.trustBadges.length > 0) {
    const trustHtml = content.trustBadges
      .map((badge) => {
        const icon = TRUST_BADGE_ICONS[badge.label] ?? TRUST_BADGE_ICON_FALLBACK;
        return `<span class="trust-badge">${icon} ${escapeHtml(badge.label)}</span>`;
      })
      .join("");
    html = html.replace(
      /<!--CMS:TRUST_START-->[\s\S]*?<!--CMS:TRUST_END-->/,
      `<!--CMS:TRUST_START-->${trustHtml}<!--CMS:TRUST_END-->`
    );
  }

  if (content.footerStaticPageNavLinks.length > 0) {
    const navHtml = content.footerStaticPageNavLinks
      .map((link) => `<li><a href="/pages/${escapeHtml(link.slug)}">${escapeHtml(link.title)}</a></li>`)
      .join("");
    html = html.replace(
      /<!--CMS:STATIC_PAGES_NAV_START-->[\s\S]*?<!--CMS:STATIC_PAGES_NAV_END-->/,
      `<!--CMS:STATIC_PAGES_NAV_START-->${navHtml}<!--CMS:STATIC_PAGES_NAV_END-->`
    );
  }

  if (content.mainNavStaticPageLinks.length > 0) {
    // Appended AFTER the existing hardcoded nav links — never replaces
    // or removes them, so nothing is duplicated or lost. Applied
    // identically to both the desktop nav and the mobile nav so the
    // two stay in sync (see the two CMS:MAIN_NAV_STATIC_PAGES marker
    // pairs in homepage-body.html).
    const linksHtml = content.mainNavStaticPageLinks
      .map((link) => `<a href="/pages/${escapeHtml(link.slug)}">${escapeHtml(link.title)}</a>`)
      .join("");
    html = html.replace(
      /<!--CMS:MAIN_NAV_STATIC_PAGES_START-->[\s\S]*?<!--CMS:MAIN_NAV_STATIC_PAGES_END-->/g,
      `<!--CMS:MAIN_NAV_STATIC_PAGES_START-->${linksHtml}<!--CMS:MAIN_NAV_STATIC_PAGES_END-->`
    );
  }

  if (content.activeKnownPageSlugs.size > 0) {
    html = fixKnownPlaceholderLinks(html, content.activeKnownPageSlugs);
  }

  return html;
}
