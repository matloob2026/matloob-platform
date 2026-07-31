"use server";

/**
 * Category Ordering (Admin) — server actions. Reuses the existing
 * CategoryAdminService entirely; `reorderCategories` (added to that
 * same service) is a thin bulk-update over the EXISTING
 * `Category.sortOrder` column already used everywhere categories are
 * listed publicly (homepage's first-6 grid, the full /categories
 * page) — no schema change, no parallel ordering system.
 *
 * Reads require `categories:view` (unchanged); saving a new order
 * requires `categories:manage`, same permission every other category
 * mutation already requires.
 */

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/auth/guards";
import { CATEGORY_MANAGE_PERMISSION } from "@/auth/permissions";
import { categoryAdminService } from "@/services/admin/category.service";

export interface CategoryOrderActionState {
  success: boolean;
  error?: string;
}

export async function listCategoriesForOrderAction() {
  await requirePermission("categories:view");
  return categoryAdminService.listCategories();
}

/** Saving a new order must be reflected on the homepage's 6-card grid
 * and the full /categories page immediately — both read the exact
 * same `sortOrder` field this writes to. */
export async function saveCategoryOrderAction(orderedIds: string[]): Promise<CategoryOrderActionState> {
  const session = await requirePermission(CATEGORY_MANAGE_PERMISSION);
  try {
    await categoryAdminService.reorderCategories(orderedIds, session.userId);
    revalidatePath("/admin/categories/order");
    revalidatePath("/admin/categories");
    revalidatePath("/categories");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("[admin/categories/order] unexpected error", err);
    return { success: false, error: "حدث خطأ غير متوقع. حاول مرة أخرى." };
  }
}
