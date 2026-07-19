"use server";

/**
 * Server actions backing the Homepage Content CMS screen
 * (src/app/admin/(protected)/homepage/page.tsx) — Checkpoint 02.
 *
 * Same shape as src/app/admin/(protected)/categories/actions.ts from
 * Checkpoint 01: thin wrappers that authorize, call
 * HomepageAdminContentService, map the result to a small serializable
 * state object, and revalidate both the Admin page and the public
 * homepage so a save is immediately visible everywhere.
 *
 * Reads are also exposed as server actions (rather than a route
 * handler) because the Admin Homepage page is a client component
 * ("use client", per Checkpoint 01 — reused as-is here) that already
 * fetches its initial data in a `useEffect`; server actions are safely
 * callable from client components without adding a new API route.
 *
 * Every action calls `requirePermission(...)` before touching the
 * database, on top of the session check the protected admin layout
 * already enforces. Mutations require `HOMEPAGE_MANAGE_PERMISSION`
 * (ADMIN only — see src/auth/permissions.ts); reads require
 * `homepage:view` (also ADMIN only, unchanged from Checkpoint 01).
 * Normal platform users have no path to any of this — server actions
 * are only reachable from within the authenticated admin route tree.
 */

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/auth/guards";
import { HOMEPAGE_MANAGE_PERMISSION } from "@/auth/permissions";
import {
  homepageAdminContentService,
  HomepageServiceError,
  type HomepageMainContentInput,
  type HomepageStatInput,
  type UpdateHomepageStatInput,
  type TrustBadgeInput,
  type UpdateTrustBadgeInput,
} from "@/services/homepage-content.service";

export interface HomepageActionState {
  success: boolean;
  error?: string;
}

function toActionState(err: unknown): HomepageActionState {
  if (err instanceof HomepageServiceError) {
    return { success: false, error: err.message };
  }
  console.error("[admin/homepage] unexpected error", err);
  return { success: false, error: "حدث خطأ غير متوقع. حاول مرة أخرى." };
}

/** Revalidates the Admin screen and the public homepage — both read
 * the same underlying tables, so both need a fresh render after any
 * save here. */
function revalidateHomepage(): void {
  revalidatePath("/admin/homepage");
  revalidatePath("/");
}

// ---------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------

export async function getHomepageMainContentAction() {
  await requirePermission("homepage:view");
  return homepageAdminContentService.getMainContent();
}

export async function listHomepageStatsAction() {
  await requirePermission("homepage:view");
  return homepageAdminContentService.listStats();
}

export async function listTrustBadgesAction() {
  await requirePermission("homepage:view");
  return homepageAdminContentService.listTrustBadges();
}

// ---------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------

export async function saveHomepageMainContentAction(
  input: HomepageMainContentInput
): Promise<HomepageActionState> {
  const session = await requirePermission(HOMEPAGE_MANAGE_PERMISSION);
  try {
    await homepageAdminContentService.saveMainContent(input, session.userId);
    revalidateHomepage();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

// ---------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------

export async function createHomepageStatAction(input: HomepageStatInput): Promise<HomepageActionState> {
  const session = await requirePermission(HOMEPAGE_MANAGE_PERMISSION);
  try {
    await homepageAdminContentService.createStat(input, session.userId);
    revalidateHomepage();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function updateHomepageStatAction(
  id: string,
  input: UpdateHomepageStatInput
): Promise<HomepageActionState> {
  const session = await requirePermission(HOMEPAGE_MANAGE_PERMISSION);
  try {
    await homepageAdminContentService.updateStat(id, input, session.userId);
    revalidateHomepage();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function setHomepageStatActiveAction(
  id: string,
  isActive: boolean
): Promise<HomepageActionState> {
  const session = await requirePermission(HOMEPAGE_MANAGE_PERMISSION);
  try {
    await homepageAdminContentService.setStatActive(id, isActive, session.userId);
    revalidateHomepage();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function deleteHomepageStatAction(id: string): Promise<HomepageActionState> {
  const session = await requirePermission(HOMEPAGE_MANAGE_PERMISSION);
  try {
    await homepageAdminContentService.deleteStat(id, session.userId);
    revalidateHomepage();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

// ---------------------------------------------------------------------
// Trust badges
// ---------------------------------------------------------------------

export async function createTrustBadgeAction(input: TrustBadgeInput): Promise<HomepageActionState> {
  const session = await requirePermission(HOMEPAGE_MANAGE_PERMISSION);
  try {
    await homepageAdminContentService.createTrustBadge(input, session.userId);
    revalidateHomepage();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function updateTrustBadgeAction(
  id: string,
  input: UpdateTrustBadgeInput
): Promise<HomepageActionState> {
  const session = await requirePermission(HOMEPAGE_MANAGE_PERMISSION);
  try {
    await homepageAdminContentService.updateTrustBadge(id, input, session.userId);
    revalidateHomepage();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function setTrustBadgeActiveAction(
  id: string,
  isActive: boolean
): Promise<HomepageActionState> {
  const session = await requirePermission(HOMEPAGE_MANAGE_PERMISSION);
  try {
    await homepageAdminContentService.setTrustBadgeActive(id, isActive, session.userId);
    revalidateHomepage();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function deleteTrustBadgeAction(id: string): Promise<HomepageActionState> {
  const session = await requirePermission(HOMEPAGE_MANAGE_PERMISSION);
  try {
    await homepageAdminContentService.deleteTrustBadge(id, session.userId);
    revalidateHomepage();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}
