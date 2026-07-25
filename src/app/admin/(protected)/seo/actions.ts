"use server";

/**
 * Server actions backing the SEO CMS screen
 * (src/app/admin/(protected)/seo/page.tsx + SeoManager.tsx). Covers
 * both `SeoSetting` rows (per-entity metaTitle/metaDescription/
 * canonicalUrl/noIndex — src/services/admin/seo.service.ts) and the
 * "seo" group of the generic `SiteSetting` store (global keyword
 * list, custom robots.txt body, custom schema.org JSON-LD —
 * src/services/admin/site-settings.service.ts). Also used by
 * src/app/admin/(protected)/pages/StaticPagesManager.tsx for
 * per-static-page SEO (entityType "static_page").
 *
 * Mutations require `SEO_MANAGE_PERMISSION` (ADMIN only); reads
 * require `seo:view` (also ADMIN only, unchanged since Checkpoint 01).
 */

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/auth/guards";
import { SEO_MANAGE_PERMISSION } from "@/auth/permissions";
import { seoAdminService, type UpdateSeoFields } from "@/services/admin/seo.service";
import {
  siteSettingsAdminService,
  SiteSettingsServiceError,
  type SeoGlobalSettings,
} from "@/services/admin/site-settings.service";

export interface SeoActionState {
  success: boolean;
  error?: string;
}

function toActionState(err: unknown): SeoActionState {
  if (err instanceof SiteSettingsServiceError) {
    return { success: false, error: err.message };
  }
  console.error("[admin/seo] unexpected error", err);
  return { success: false, error: "حدث خطأ غير متوقع. حاول مرة أخرى." };
}

function revalidateSeo(entityId: string | null): void {
  revalidatePath("/admin/seo");
  revalidatePath("/");
  revalidatePath("/robots.txt");
  revalidatePath("/sitemap.xml");
  if (entityId) revalidatePath(`/pages/${entityId}`);
}

// ---------------------------------------------------------------------
// Per-entity SEO (SeoSetting) — global + homepage here; static pages
// use the same underlying action from StaticPagesManager.tsx directly.
// ---------------------------------------------------------------------

export async function getEntitySeoAction(entityType: string, entityId: string | null) {
  await requirePermission("seo:view");
  return seoAdminService.getSeo(entityType, entityId);
}

export async function saveEntitySeoAction(
  entityType: string,
  entityId: string | null,
  values: { ar: UpdateSeoFields; en: UpdateSeoFields }
): Promise<SeoActionState> {
  const session = await requirePermission(SEO_MANAGE_PERMISSION);
  try {
    await seoAdminService.saveSeo(entityType, entityId, values, session.userId);
    revalidateSeo(entityId);
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

// ---------------------------------------------------------------------
// Global SEO extras (SiteSetting "seo" group) — keywords, robots.txt
// override, schema.org JSON-LD.
// ---------------------------------------------------------------------

export async function getSeoGlobalSettingsAction() {
  await requirePermission("seo:view");
  const all = await siteSettingsAdminService.getAllSettings();
  return all.seo;
}

export async function saveSeoGlobalSettingsAction(values: SeoGlobalSettings): Promise<SeoActionState> {
  const session = await requirePermission(SEO_MANAGE_PERMISSION);
  try {
    await siteSettingsAdminService.saveGroup("seo", values, session.userId);
    revalidateSeo(null);
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}
