import type { MetadataRoute } from "next";
import { getAllActiveStaticPageSlugs } from "@/lib/static-page-public-content";
import { getAllPublishedBlogSlugs } from "@/lib/blog-public-content";

/**
 * `/sitemap.xml` — Part 3 (Technical SEO) of the Settings/SEO CMS
 * task. Uses Next.js's built-in `sitemap.ts` file convention. Lists
 * the homepage, every currently active Static Page (see
 * `getAllActiveStaticPageSlugs`), the Blog listing page, and every
 * currently published Blog article (see `getAllPublishedBlogSlugs` —
 * reuses the existing `BlogPost` reads, no duplicate query logic). A
 * deactivated/unpublished/deleted page or article simply drops out on
 * the next request; nothing needs to be hand-maintained here as
 * content is added through the Admin CMS.
 *
 * Reuses the same `NEXTAUTH_URL` base-URL convention already
 * established in src/services/auth.service.ts.
 */
const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pageSlugs, blogSlugs] = await Promise.all([getAllActiveStaticPageSlugs(), getAllPublishedBlogSlugs()]);

  return [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    ...pageSlugs.map((slug) => ({
      url: `${BASE_URL}/pages/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    { url: `${BASE_URL}/blog`, changeFrequency: "daily" as const, priority: 0.7 },
    ...blogSlugs.map((slug) => ({
      url: `${BASE_URL}/blog/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
