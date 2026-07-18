"use server";

/**
 * Server actions backing the Categories CMS screen
 * (src/app/admin/(protected)/categories/page.tsx +
 * CategoriesManager.tsx).
 *
 * Thin by design — parse/authorize, call CategoryAdminService, map the
 * result to a small serializable state object, and revalidate the page
 * so the server-fetched list reflects the change. All actual business
 * logic (validation, transactions, audit logging, safe-delete checks)
 * lives in the service — see src/services/admin/category.service.ts.
 *
 * Every action calls `requirePermission(CATEGORY_MANAGE_PERMISSION)`
 * (ADMIN only — see src/auth/permissions.ts) before touching the
 * database, on top of the existing `requireAdminSession()` guard already
 * enforced by the protected admin layout. A normal platform user has no
 * path to these functions at all: they are server actions reachable
 * only from within the authenticated admin route tree.
 */

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/auth/guards";
import { CATEGORY_MANAGE_PERMISSION } from "@/auth/permissions";
import {
  categoryAdminService,
  CategoryServiceError,
  type CategoryInput,
  type UpdateCategoryInput,
} from "@/services/admin/category.service";

export interface CategoryActionState {
  success: boolean;
  error?: string;
}

function toActionState(err: unknown): CategoryActionState {
  if (err instanceof CategoryServiceError) {
    return { success: false, error: err.message };
  }
  console.error("[admin/categories] unexpected error", err);
  return { success: false, error: "حدث خطأ غير متوقع. حاول مرة أخرى." };
}

export async function createCategoryAction(input: CategoryInput): Promise<CategoryActionState> {
  const session = await requirePermission(CATEGORY_MANAGE_PERMISSION);
  try {
    await categoryAdminService.createCategory(input, session.userId);
    revalidatePath("/admin/categories");
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function updateCategoryAction(
  id: string,
  input: UpdateCategoryInput
): Promise<CategoryActionState> {
  const session = await requirePermission(CATEGORY_MANAGE_PERMISSION);
  try {
    await categoryAdminService.updateCategory(id, input, session.userId);
    revalidatePath("/admin/categories");
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function setCategoryActiveAction(
  id: string,
  isActive: boolean
): Promise<CategoryActionState> {
  const session = await requirePermission(CATEGORY_MANAGE_PERMISSION);
  try {
    await categoryAdminService.setCategoryActive(id, isActive, session.userId);
    revalidatePath("/admin/categories");
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function deleteCategoryAction(id: string): Promise<CategoryActionState> {
  const session = await requirePermission(CATEGORY_MANAGE_PERMISSION);
  try {
    await categoryAdminService.deleteCategory(id, session.userId);
    revalidatePath("/admin/categories");
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}
