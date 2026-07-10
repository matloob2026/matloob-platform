/**
 * Admin-facing types. These map directly onto the "admin-editable
 * content" tables in prisma/schema.prisma: SiteSetting, PageContent,
 * HomepageStat, TrustBadge, SocialLink, SeoSetting, Media.
 *
 * Every string a visitor sees on the homepage that ISN'T user-generated
 * content (i.e. not a Request/Offer) should be traceable to one of
 * these types. If you find yourself hardcoding copy in a component,
 * it belongs in one of these tables instead.
 */

import type { Locale } from "./domain";

export type SettingValueType =
  | "STRING"
  | "NUMBER"
  | "BOOLEAN"
  | "JSON"
  | "COLOR"
  | "IMAGE_URL"
  | "RICH_TEXT";

/** Flat key/value settings — logo url, brand color, contact email... */
export interface SiteSetting {
  id: string;
  group: SiteSettingGroup;
  key: string;
  valueType: SettingValueType;
  value: string;
}

export type SiteSettingGroup =
  | "branding" // logo, favicon, primary/secondary colors
  | "contact" // support email, phone, whatsapp
  | "footer" // footer statement, copyright line
  | "social" // handled via SocialLink table instead, kept for future flags
  | "feature_flags" // e.g. enable_ai_assistant, enable_offers_chat
  | "localization_defaults"; // default country/currency when none resolved

/** Structured, translatable page sections (hero, how-it-works, CTA...) */
export interface PageContentBlock {
  id: string;
  page: string; // "homepage"
  section: PageSection;
  locale: Locale;
  heading?: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  mediaUrl?: string;
  extra?: Record<string, unknown>;
  isPublished: boolean;
}

export type PageSection =
  | "hero"
  | "how_it_works"
  | "cta"
  | "footer_statement"
  | "trust_section";

export interface HomepageStatConfig {
  id: string;
  key: string;
  value: number;
  iconUrl?: string;
  sortOrder: number;
  isActive: boolean;
  label: Record<Locale, string>;
}

export interface TrustBadgeConfig {
  id: string;
  iconUrl?: string;
  sortOrder: number;
  isActive: boolean;
  label: Record<Locale, string>;
}

export interface SocialLinkConfig {
  id: string;
  platform: string;
  url: string;
  isActive: boolean;
  sortOrder: number;
}

export interface SeoConfig {
  id: string;
  entityType: "homepage" | "category" | "request" | "global";
  entityId?: string;
  locale: Locale;
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
  noIndex: boolean;
}

/**
 * The single object the homepage server component fetches at render
 * time. Assembling this is the job of
 * src/services/homepage-content.service.ts — components never query
 * PageContent/HomepageStat/etc. directly.
 */
export interface HomepageConfig {
  hero: PageContentBlock;
  howItWorks: PageContentBlock;
  cta: PageContentBlock;
  footerStatement: PageContentBlock;
  stats: HomepageStatConfig[];
  trustBadges: TrustBadgeConfig[];
  socialLinks: SocialLinkConfig[];
  seo: SeoConfig;
  branding: {
    logoUrl: string;
    primaryColor: string;
    secondaryColor: string;
  };
}
