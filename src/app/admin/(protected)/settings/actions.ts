"use server";

/**
 * Server actions backing the Global Site Settings CMS screen
 * (src/app/admin/(protected)/settings/page.tsx + SettingsManager.tsx).
 * Same shape as every other CMS actions.ts in this codebase.
 *
 * Mutations require `SETTINGS_MANAGE_PERMISSION` (ADMIN only); reads
 * require `settings:view` (also ADMIN only, unchanged since
 * Checkpoint 01).
 */

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/auth/guards";
import { SETTINGS_MANAGE_PERMISSION } from "@/auth/permissions";
import {
  siteSettingsAdminService,
  SiteSettingsServiceError,
  type AllSiteSettings,
} from "@/services/admin/site-settings.service";

export interface SettingsActionState {
  success: boolean;
  error?: string;
}

function toActionState(err: unknown): SettingsActionState {
  if (err instanceof SiteSettingsServiceError) {
    return { success: false, error: err.message };
  }
  console.error("[admin/settings] unexpected error", err);
  return { success: false, error: "حدث خطأ غير متوقع. حاول مرة أخرى." };
}

/** Every public surface these settings can affect (homepage title/
 * name, SiteHeader wordmark, footer social links, the Contact static
 * page, robots.txt) — revalidated together since a single settings
 * save can touch any of them. */
function revalidatePublicSurfaces(): void {
  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/pages/[slug]", "page");
  revalidatePath("/robots.txt");
}

export async function getAllSettingsAction() {
  await requirePermission("settings:view");
  return siteSettingsAdminService.getAllSettings();
}

export async function saveSettingsGroupAction<G extends keyof AllSiteSettings>(
  group: G,
  values: AllSiteSettings[G]
): Promise<SettingsActionState> {
  const session = await requirePermission(SETTINGS_MANAGE_PERMISSION);
  try {
    await siteSettingsAdminService.saveGroup(group, values, session.userId);
    revalidatePublicSurfaces();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}
