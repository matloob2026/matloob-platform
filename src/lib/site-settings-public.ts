/**
 * Read-only global site settings for public surfaces (homepage,
 * SiteHeader, footer social links, the "Contact" static page). Mirrors
 * src/lib/homepage-public-content.ts / src/lib/static-page-public-content.ts:
 * a thin public loader, kept separate from the Admin CRUD service
 * (src/services/admin/site-settings.service.ts), reading the SAME
 * `SiteSetting` rows. No auth required; every function degrades to a
 * safe default instead of throwing.
 */

import { prisma } from "@/lib/prisma";

export interface PublicSiteBrand {
  siteName: string;
  tagline: string;
}

const DEFAULT_BRAND: PublicSiteBrand = { siteName: "مطلوب", tagline: "بدل ما تدور... اطلبها" };

async function readSetting(group: string, key: string): Promise<string | null> {
  const row = await prisma.siteSetting.findUnique({ where: { group_key: { group, key } } });
  return row?.value?.trim() || null;
}

/** Site name/tagline — used for the `<title>` on the homepage and
 * static pages, and for `SiteHeader`'s wordmark. Falls back to the
 * platform's existing hardcoded name/tagline when nothing is saved
 * yet, so nothing changes until an admin actually sets it. */
export async function getPublicSiteBrand(): Promise<PublicSiteBrand> {
  const [siteNameAr, taglineAr] = await Promise.all([
    readSetting("brand", "site_name_ar"),
    readSetting("brand", "tagline_ar"),
  ]);
  return {
    siteName: siteNameAr ?? DEFAULT_BRAND.siteName,
    tagline: taglineAr ?? DEFAULT_BRAND.tagline,
  };
}

export interface PublicSiteSocial {
  x: string | null;
  instagram: string | null;
}

/** Only the two platforms that already have an icon slot in the
 * locked homepage footer (see CMS:SOCIAL_X_START/SOCIAL_INSTAGRAM_START
 * markers in homepage-body.html) — Facebook/TikTok/LinkedIn/YouTube
 * are still fully manageable from the Admin, they just have no
 * existing visual slot to plug into without adding new icons, which
 * would be a footer redesign. */
export async function getPublicSiteSocial(): Promise<PublicSiteSocial> {
  const [x, instagram] = await Promise.all([readSetting("social", "x"), readSetting("social", "instagram")]);
  return { x, instagram };
}

export interface PublicSiteContact {
  contactEmail: string | null;
  supportEmail: string | null;
  contactPhone: string | null;
  whatsappNumber: string | null;
  address: string | null;
}

/** Used by the "Contact" static page (slug "contact") to render a
 * small, live contact-details block below its CMS content — see
 * src/app/pages/[slug]/page.tsx. Every field is optional; a page with
 * none configured simply doesn't render the block. */
export async function getPublicSiteContact(): Promise<PublicSiteContact> {
  const [contactEmail, supportEmail, contactPhone, whatsappNumber, address] = await Promise.all([
    readSetting("contact", "contact_email"),
    readSetting("contact", "support_email"),
    readSetting("contact", "contact_phone"),
    readSetting("contact", "whatsapp_number"),
    readSetting("contact", "address"),
  ]);
  return { contactEmail, supportEmail, contactPhone, whatsappNumber, address };
}

/** Homepage maintenance-mode switch — see
 * src/app/(marketing)/page.tsx. Defaults to `false` (site up) when
 * unset. */
export async function getPublicMaintenanceMode(): Promise<boolean> {
  const row = await prisma.siteSetting.findUnique({
    where: { group_key: { group: "behavior", key: "maintenance_mode" } },
  });
  return row?.value === "true";
}
