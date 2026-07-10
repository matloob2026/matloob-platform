/**
 * HomepageContentService
 * =======================
 * This service is the single boundary between the database and every
 * component that renders homepage content (hero text, stats, trust
 * badges, footer statement, SEO tags, branding).
 *
 * RULE: No React component, layout, or page in src/app or
 * src/components may import Prisma directly to fetch homepage content.
 * They call `getHomepageConfig(locale)` from here and receive a fully
 * typed, already-localized `HomepageConfig` object
 * (see src/types/admin.ts).
 *
 * WHY: this is what makes "everything editable from the Admin
 * Dashboard" actually true in practice, not just in the schema. If a
 * component fetched PageContent directly, every future homepage field
 * would require a frontend code change to expose. Funneling everything
 * through one service means the Admin Dashboard can add a field to
 * `extra` (Json) and the homepage picks it up with zero component
 * changes, as long as this service maps it through.
 *
 * IMPLEMENTATION STATUS: interface + contract only (Phase 1 —
 * architecture). Wire up the actual Prisma queries in Phase 2.
 */

import type { Locale } from "@/types/domain";
import type { HomepageConfig } from "@/types/admin";

export interface HomepageContentService {
  getHomepageConfig(locale: Locale): Promise<HomepageConfig>;
}

/**
 * TODO (Phase 2): implement against Prisma.
 *
 * Sketch of the real implementation:
 *
 *   async getHomepageConfig(locale) {
 *     const [hero, howItWorks, cta, footerStatement, stats, badges, links, seo, branding] =
 *       await Promise.all([
 *         prisma.pageContent.findUnique({ where: { page_section_locale: { page: 'homepage', section: 'hero', locale } } }),
 *         prisma.pageContent.findUnique({ where: { page_section_locale: { page: 'homepage', section: 'how_it_works', locale } } }),
 *         prisma.pageContent.findUnique({ where: { page_section_locale: { page: 'homepage', section: 'cta', locale } } }),
 *         prisma.pageContent.findUnique({ where: { page_section_locale: { page: 'homepage', section: 'footer_statement', locale } } }),
 *         prisma.homepageStat.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, include: { translations: true, icon: true } }),
 *         prisma.trustBadge.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' }, include: { translations: true, icon: true } }),
 *         prisma.socialLink.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
 *         prisma.seoSetting.findUnique({ where: { entityType_entityId_locale: { entityType: 'homepage', entityId: null, locale } } }),
 *         getBrandingSettings(), // reads SiteSetting group="branding"
 *       ]);
 *
 *     return mapToHomepageConfig({ hero, howItWorks, cta, footerStatement, stats, badges, links, seo, branding });
 *   }
 *
 * This should be cached (see src/lib/cache.ts, not yet implemented) with
 * a short TTL + explicit invalidation on Admin Dashboard save, since the
 * homepage is read constantly but written rarely.
 */
export class PrismaHomepageContentService implements HomepageContentService {
  async getHomepageConfig(_locale: Locale): Promise<HomepageConfig> {
    throw new Error(
      "PrismaHomepageContentService.getHomepageConfig not yet implemented — Phase 1 is architecture only. See docstring above for the implementation plan."
    );
  }
}
