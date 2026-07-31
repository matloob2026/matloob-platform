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
import type { PublicCategorySummary } from "@/lib/category-public-content";
import type { PublicBlogPostSummary } from "@/lib/blog-public-content";
import type { RequestSummary } from "@/types/domain";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Arabic relative time for a request card's publish time (منذ ساعة /
 * منذ 3 ساعات / منذ يوم / منذ يومين / ...) — Arabic has singular/dual/
 * plural forms that plain `Intl.RelativeTimeFormat` doesn't get
 * exactly right for this kind of casual "منذ" phrasing, so this
 * spells out the four forms explicitly for each unit. Falls back to
 * an absolute date once it's more than a month old. */
function formatArabicRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  function phrase(count: number, singular: string, dual: string, plural: string, pluralWithNumber: string): string {
    if (count === 1) return `منذ ${singular}`;
    if (count === 2) return `منذ ${dual}`;
    if (count >= 3 && count <= 10) return `منذ ${count.toLocaleString("ar")} ${plural}`;
    return `منذ ${count.toLocaleString("ar")} ${pluralWithNumber}`;
  }

  if (diffMinutes < 1) return "الآن";
  if (diffMinutes < 60) return phrase(diffMinutes, "دقيقة", "دقيقتين", "دقائق", "دقيقة");
  if (diffHours < 24) return phrase(diffHours, "ساعة", "ساعتين", "ساعات", "ساعة");
  if (diffDays < 30) return phrase(diffDays, "يوم", "يومين", "أيام", "يوم");

  return date.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
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

const TRUST_BADGE_ICONS: Record<string, string> = {
  "دفع وتواصل آمن":
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
  "دعم فني 24/7":
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
};
const TRUST_BADGE_ICON_FALLBACK =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>';

// Category grid — Categories module completion. Every category now
// comes from the database (see getPublicCategories in
// src/lib/category-public-content.ts). No per-category hardcoded
// icons or images remain — a category with neither an uploaded image
// nor an uploaded icon (via the Media Library) falls back to this one
// single, generic placeholder icon.
const CATEGORY_ICON_FALLBACK =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 12h8M12 8v8"/></svg>';

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
    social: { x: string | null; instagram: string | null };
    categories: PublicCategorySummary[];
    blogPosts: PublicBlogPostSummary[];
    featuredRequests: RequestSummary[];
    hasMoreRequests: boolean;
    /** Favorites — only meaningful for a signed-in visitor; the heart
     * icon redirects a guest to login instead of calling the toggle
     * API (see public/marketing/homepage-scripts.js's
     * `toggleFavorite`). */
    isAuthenticated: boolean;
    favoritedRequestIds: Set<string>;
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

  if (content.trustBadges.length > 0) {
    const trustHtml = content.trustBadges
      .map((badge) => {
        const icon = badge.iconUrl
          ? `<img src="${escapeHtml(badge.iconUrl)}" alt="" width="16" height="16" style="object-fit:cover;border-radius:4px" />`
          : TRUST_BADGE_ICONS[badge.label] ?? TRUST_BADGE_ICON_FALLBACK;
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

  if (content.social.x) {
    html = html.replace(
      /<!--CMS:SOCIAL_X_START-->[\s\S]*?<!--CMS:SOCIAL_X_END-->/,
      (match) => match.replace('href="#"', `href="${escapeHtml(content.social.x!)}"`)
    );
  }
  if (content.social.instagram) {
    html = html.replace(
      /<!--CMS:SOCIAL_INSTAGRAM_START-->[\s\S]*?<!--CMS:SOCIAL_INSTAGRAM_END-->/,
      (match) => match.replace('href="#"', `href="${escapeHtml(content.social.instagram!)}"`)
    );
  }

  if (content.categories.length > 0) {
    const delayClasses = ["reveal-delay-1", "reveal-delay-2", "reveal-delay-3", "reveal-delay-4"];
    const gridHtml = content.categories
      .map((category, index) => {
        const delayClass = delayClasses[index % delayClasses.length];
        const href = `/categories/${escapeHtml(category.slug)}`;
        // Fallback chain per this task: real image -> real icon (used
        // as the card's photo when no image was set) -> a plain
        // colored placeholder tile — never a fabricated stock photo.
        const photoUrl = category.imageUrl ?? category.iconUrl;
        const photoHtml = photoUrl
          ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(category.name)}">`
          : `<div class="cat-card-placeholder" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:${escapeHtml(
              category.colorHex ?? "#0f766e"
            )}22;color:${escapeHtml(category.colorHex ?? "#0f766e")}">${CATEGORY_ICON_FALLBACK}</div>`;
        // The small overlay badge icon always prefers the category's
        // own uploaded icon; only falls back to the one generic
        // placeholder icon otherwise — no hardcoded per-category icons.
        const badgeIcon = category.iconUrl
          ? `<img src="${escapeHtml(category.iconUrl)}" alt="" width="16" height="16" style="object-fit:cover;border-radius:4px" />`
          : CATEGORY_ICON_FALLBACK;
        return (
          `<a href="${href}" class="cat-card ${delayClass}">` +
          photoHtml +
          `<div class="cat-overlay"><span class="cat-ic">${badgeIcon}</span><span>${escapeHtml(category.name)}</span><span style="font-size:11px;font-weight:600;opacity:.85">${category.requestCount.toLocaleString("ar")} طلب</span></div>` +
          `</a>`
        );
      })
      .join("");
    html = html.replace(
      /<!--CMS:CATEGORIES_GRID_START-->[\s\S]*?<!--CMS:CATEGORIES_GRID_END-->/,
      `<!--CMS:CATEGORIES_GRID_START-->${gridHtml}<!--CMS:CATEGORIES_GRID_END-->`
    );
    html = html.replace(
      /<!--CMS:CATEGORIES_SEE_ALL_START-->[\s\S]*?<!--CMS:CATEGORIES_SEE_ALL_END-->/,
      `<!--CMS:CATEGORIES_SEE_ALL_START--><a href="/categories" class="see-all">عرض الكل ←</a><!--CMS:CATEGORIES_SEE_ALL_END-->`
    );
  }

  if (content.featuredRequests.length > 0) {
    const delayClasses = ["reveal-delay-1", "reveal-delay-2", "reveal-delay-3"];
    const requestsGridHtml = content.featuredRequests
      .map((req, index) => {
        const delayClass = delayClasses[index % delayClasses.length];
        const thumbHtml = req.coverImageUrl
          ? `<img src="${escapeHtml(req.coverImageUrl)}" alt="${escapeHtml(req.title)}">`
          : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#0f766e22;color:#0f766e">${CATEGORY_ICON_FALLBACK}</div>`;
        const relativeTime = req.publishedAt ? formatArabicRelativeTime(new Date(req.publishedAt)) : "";
        const isFavorited = content.favoritedRequestIds.has(req.id);
        // The heart never renders as a real link (it lives inside the
        // card's own <a>) — stopPropagation keeps clicking it from
        // also navigating to the request page.
        const heartHtml =
          `<button type="button" class="req-bookmark${isFavorited ? " req-bookmark-active" : ""}" ` +
          `style="border:0;cursor:pointer;padding:0;font:inherit" ` +
          `data-request-id="${escapeHtml(req.id)}" data-favorited="${isFavorited}" ` +
          `onclick="event.preventDefault();event.stopPropagation();toggleFavorite(this)" aria-label="إضافة للمفضلة">` +
          `<svg width="15" height="15" viewBox="0 0 24 24" fill="${isFavorited ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2">` +
          `<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg></button>`;
        return (
          `<a href="/requests/${req.id}" class="req-card ${delayClass}">` +
          `<div class="req-thumb">${thumbHtml}<span class="req-badge">${escapeHtml(req.category.name.current)}</span>${heartHtml}` +
          (relativeTime ? `<span class="req-time-overlay">${escapeHtml(relativeTime)}</span>` : "") +
          `</div>` +
          `<div class="req-body"><h3>${escapeHtml(req.title)}</h3>` +
          `<p>${escapeHtml(req.city ? req.city.name.current : req.country.code)}</p>` +
          `</div></a>`
        );
      })
      .join("");
    html = html.replace(
      /<!--CMS:REQUESTS_GRID_START-->[\s\S]*?<!--CMS:REQUESTS_GRID_END-->/,
      `<!--CMS:REQUESTS_GRID_START--><div data-authenticated="${content.isAuthenticated}" style="display:contents">${requestsGridHtml}</div><!--CMS:REQUESTS_GRID_END-->`
    );

    // Requests ticker — reuses this SAME already-fetched list (every
    // published request, featured ones first, never gated on
    // isFeatured — see request.service.ts's listAllPublished) rather
    // than a second query. Duplicated once so the CSS marquee
    // (`.ticker-track`, translateX(-50%)) loops seamlessly: once the
    // first copy has fully scrolled past, the second copy is exactly
    // where the first one started.
    const tickerItemHtml = content.featuredRequests
      .map((req) => {
        const relativeTime = req.publishedAt ? formatArabicRelativeTime(new Date(req.publishedAt)) : "";
        const cityLabel = req.city ? req.city.name.current : req.country.code;
        return (
          `<a href="/requests/${req.id}" class="ticker-item">` +
          `<span class="ticker-icon">●</span> ${escapeHtml(req.title)} ` +
          `<span class="ticker-city">· ${escapeHtml(cityLabel)}</span>` +
          (relativeTime ? ` <span class="ticker-time">${escapeHtml(relativeTime)}</span>` : "") +
          `</a>`
        );
      })
      .join("");
    if (tickerItemHtml) {
      html = html.replace(
        /<!--CMS:REQUESTS_TICKER_START-->[\s\S]*?<!--CMS:REQUESTS_TICKER_END-->/,
        `<!--CMS:REQUESTS_TICKER_START-->${tickerItemHtml}${tickerItemHtml}<!--CMS:REQUESTS_TICKER_END-->`
      );
    }
  }

  // "عرض جميع الطلبات" — only shown once more than the 12 displayed
  // requests actually exist; hidden entirely otherwise (not just a
  // dead "#" link like before).
  const requestsSeeAllHtml = content.hasMoreRequests
    ? `<a href="/requests" class="see-all">عرض جميع الطلبات ←</a>`
    : "";
  html = html.replace(
    /<!--CMS:REQUESTS_SEE_ALL_START-->[\s\S]*?<!--CMS:REQUESTS_SEE_ALL_END-->/,
    `<!--CMS:REQUESTS_SEE_ALL_START-->${requestsSeeAllHtml}<!--CMS:REQUESTS_SEE_ALL_END-->`
  );

  if (content.blogPosts.length > 0) {
    const delayClasses = ["reveal-delay-1", "reveal-delay-2", "reveal-delay-3"];
    const gridHtml = content.blogPosts
      .slice(0, 3)
      .map((post, index) => {
        const delayClass = delayClasses[index % delayClasses.length];
        const href = `/blog/${escapeHtml(post.slug)}`;
        const dateLabel = post.publishedAt
          ? new Date(post.publishedAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })
          : null;
        const thumbHtml = post.featuredImageUrl
          ? `<img src="${escapeHtml(post.featuredImageUrl)}" alt="${escapeHtml(post.title)}">`
          : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#0f766e22;color:#0f766e">${CATEGORY_ICON_FALLBACK}</div>`;
        return (
          `<div class="req-card ${delayClass}">` +
          `<div class="req-thumb">${thumbHtml}${
            post.categoryName ? `<span class="req-badge">${escapeHtml(post.categoryName)}</span>` : ""
          }</div>` +
          `<div class="req-body"><h3>${escapeHtml(post.title)}</h3>` +
          (post.excerpt ? `<p>${escapeHtml(post.excerpt)}</p>` : "") +
          (dateLabel
            ? `<div class="req-meta-row"><span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg> ${escapeHtml(dateLabel)}</span></div>`
            : "") +
          `<a href="${href}" class="see-all">اقرأ المزيد ←</a>` +
          `</div></div>`
        );
      })
      .join("");
    html = html.replace(
      /<!--CMS:BLOG_GRID_START-->[\s\S]*?<!--CMS:BLOG_GRID_END-->/,
      `<!--CMS:BLOG_GRID_START-->${gridHtml}<!--CMS:BLOG_GRID_END-->`
    );
  }

  return html;
}
