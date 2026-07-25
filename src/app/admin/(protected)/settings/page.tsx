import { requirePermission } from "@/auth/guards";
import { PageHeader } from "@/components/admin/PageHeader";
import { siteSettingsAdminService } from "@/services/admin/site-settings.service";
import { SettingsManager } from "./SettingsManager";

/**
 * Global Site Settings CMS — real, database-backed, replacing the
 * Checkpoint 01 mock screen. Reuses the existing `SiteSetting` model
 * (see src/services/admin/site-settings.service.ts) — no new model.
 *
 * `requirePermission` ensures only an authenticated ADMIN session
 * reaches this page ("settings:view" is not granted to MODERATOR —
 * see src/auth/permissions.ts). Mutations go through the server
 * actions in ./actions.ts, which re-validate "settings:manage"
 * server-side before touching the database.
 */
export default async function AdminSettingsPage() {
  await requirePermission("settings:view");
  const settings = await siteSettingsAdminService.getAllSettings();

  return (
    <div>
      <PageHeader
        title="الإعدادات العامة"
        description="الإعدادات الأساسية للمنصة — متصلة مباشرة بقاعدة البيانات وتنعكس على الموقع العام"
      />
      <SettingsManager initialSettings={settings} />
    </div>
  );
}
