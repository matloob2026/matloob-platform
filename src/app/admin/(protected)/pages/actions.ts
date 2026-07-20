"use server";

/**
 * Server actions backing the Static Pages CMS screen
 * (src/app/admin/(protected)/pages/page.tsx + StaticPagesManager.tsx)
 * — Checkpoint 03. Same shape as Checkpoint 01/02's actions.ts files:
 * thin wrappers that authorize, call StaticPageAdminService, map the
 * result to a small serializable state object, and revalidate both
 * the Admin screen and the public page route.
 *
 * Mutations require `PAGE_MANAGE_PERMISSION` (ADMIN only — see
 * src/auth/permissions.ts); reads require `pages:view` (also ADMIN
 * only, unchanged since Checkpoint 01). Normal platform users have no
 * path to any of this — server actions are only reachable from within
 * the authenticated admin route tree.
 */

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/auth/guards";
import { PAGE_MANAGE_PERMISSION } from "@/auth/permissions";
import {
  staticPageAdminService,
  StaticPageServiceError,
  type StaticPageInput,
  type UpdateStaticPageInput,
} from "@/services/admin/static-page.service";

export interface StaticPageActionState {
  success: boolean;
  error?: string;
}

function toActionState(err: unknown): StaticPageActionState {
  if (err instanceof StaticPageServiceError) {
    return { success: false, error: err.message };
  }
  console.error("[admin/pages] unexpected error", err);
  return { success: false, error: "حدث خطأ غير متوقع. حاول مرة أخرى." };
}

/** Revalidates the Admin list, the specific public route(s) affected
 * (both the old and new slug, in case this was a rename), and the
 * public homepage — whose footer "Legal" links now list published
 * static pages (Checkpoint 04, see ../../../(marketing)/homepage-render.ts). */
function revalidateStaticPages(...slugs: string[]): void {
  revalidatePath("/admin/pages");
  for (const slug of slugs) {
    revalidatePath(`/pages/${slug}`);
  }
  revalidatePath("/");
}

export async function listStaticPagesAction() {
  await requirePermission("pages:view");
  return staticPageAdminService.listPages();
}

export async function createStaticPageAction(input: StaticPageInput): Promise<StaticPageActionState> {
  const session = await requirePermission(PAGE_MANAGE_PERMISSION);
  try {
    await staticPageAdminService.createPage(input, session.userId);
    revalidateStaticPages(input.slug);
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function updateStaticPageAction(
  slug: string,
  input: UpdateStaticPageInput
): Promise<StaticPageActionState> {
  const session = await requirePermission(PAGE_MANAGE_PERMISSION);
  try {
    await staticPageAdminService.updatePage(slug, input, session.userId);
    revalidateStaticPages(slug, input.slug ?? slug);
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function setStaticPageActiveAction(
  slug: string,
  isActive: boolean
): Promise<StaticPageActionState> {
  const session = await requirePermission(PAGE_MANAGE_PERMISSION);
  try {
    await staticPageAdminService.setPageActive(slug, isActive, session.userId);
    revalidateStaticPages(slug);
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function deleteStaticPageAction(slug: string): Promise<StaticPageActionState> {
  const session = await requirePermission(PAGE_MANAGE_PERMISSION);
  try {
    await staticPageAdminService.deletePage(slug, session.userId);
    revalidateStaticPages(slug);
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}
