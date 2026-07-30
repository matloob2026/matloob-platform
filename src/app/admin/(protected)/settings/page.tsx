import { requirePermission } from "@/auth/guards";
import { PageHeader } from "@/components/admin/PageHeader";
import { siteSettingsAdminService } from "@/services/admin/site-settings.service";
import { MAX_IMAGE_BYTES, ALLOWED_MIME_TYPES } from "@/services/media.service";
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
 *
 * Administration module: also computes the Email/Upload status shown
 * (read-only) on the "integrations" tab, directly from the existing
 * environment variables and code constants — see
 * SettingsManager.tsx's `IntegrationsStatusTab` for why these stay
 * server-config rather than live-editable settings.
 */
export default async function AdminSettingsPage() {
  await requirePermission("settings:view");
  const settings = await siteSettingsAdminService.getAllSettings();

  const integrationsStatus = {
    emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
    emailFromAddress: process.env.RESEND_FROM_EMAIL ?? null,
    maxUploadMb: Math.round(MAX_IMAGE_BYTES / (1024 * 1024)),
    allowedUploadTypes: ALLOWED_MIME_TYPES.join(", "),
  };

  return (
    <div>
      <PageHeader
        title="الإعدادات العامة"
        description="الإعدادات الأساسية للمنصة — متصلة مباشرة بقاعدة البيانات وتنعكس على الموقع العام"
      />
      <SettingsManager initialSettings={settings} integrationsStatus={integrationsStatus} />
    </div>
  );
}
