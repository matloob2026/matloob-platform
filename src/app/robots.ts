import type { MetadataRoute } from "next";

/**
 * `/robots.txt` — Part 3 (Technical SEO) of the Settings/SEO CMS task.
 * Uses Next.js's built-in `robots.ts` file convention (no custom route
 * handler needed). Disallows the Admin Dashboard and its API routes
 * (nothing there should ever be indexed) and points crawlers at the
 * sitemap (see ./sitemap.ts).
 *
 * Reuses the same `NEXTAUTH_URL` base-URL convention already
 * established in src/services/auth.service.ts, rather than
 * introducing a new environment variable.
 */
const BASE_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
