import { requirePermission } from "@/auth/guards";
import { PageHeader } from "@/components/admin/PageHeader";
import { seoAdminService } from "@/services/admin/seo.service";
import { siteSettingsAdminService } from "@/services/admin/site-settings.service";
import { SeoManager } from "./SeoManager";

/**
 * SEO CMS — real, database-backed, replacing the Checkpoint 01 mock
 * screen. Reuses the existing `SeoSetting` model (per-entity SEO) and
 * the `SiteSetting` "seo" group (global keywords/robots/schema) — see
 * src/services/admin/seo.service.ts and
 * src/services/admin/site-settings.service.ts. No new model.
 *
 * `requirePermission` ensures only an authenticated ADMIN session
 * reaches this page ("seo:view" is not granted to MODERATOR). Static
 * Page SEO is edited inline on the Static Pages screen, not here —
 * see src/app/admin/(protected)/pages/StaticPagesManager.tsx.
 */
export default async function AdminSeoPage() {
  await requirePermission("seo:view");

  const [globalSeo, homepageSeo, allSettings] = await Promise.all([
    seoAdminService.getSeo("global", null),
    seoAdminService.getSeo("homepage", null),
    siteSettingsAdminService.getAllSettings(),
  ]);

  return (
    <div>
      <PageHeader
        title="إدارة SEO"
        description="إعدادات محركات البحث للصفحة الرئيسية والإعدادات العامة للموقع — تنعكس مباشرة على الموقع العام"
      />
      <SeoManager globalSeo={globalSeo} homepageSeo={homepageSeo} seoGlobalSettings={allSettings.seo} />
    </div>
  );
}
