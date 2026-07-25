import type { MetadataRoute } from "next";
import { getAllActiveStaticPageSlugs } from "@/lib/static-page-public-content";

/**
 * `/sitemap.xml` — Part 3 (Technical SEO) of the Settings/SEO CMS
 * task. Uses Next.js's built-in `sitemap.ts` file convention. Lists
 * the homepage plus every currently active Static Page (see
 * `getAllActiveStaticPageSlugs` — reuses the existing `PageContent`
 * reads, no duplicate query logic). A deactivated or deleted page
 * simply drops out on the next request; nothing needs to be
 * hand-maintained here as pages are added through the Admin CMS.
 *
 * Reuses the same `NEXTAUTH_URL` base-URL convention already
 * established in src/services/auth.service.ts.
 */
const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getAllActiveStaticPageSlugs();

  return [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    ...slugs.map((slug) => ({
      url: `${BASE_URL}/pages/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
