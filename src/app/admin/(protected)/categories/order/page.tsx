import { requirePermission } from "@/auth/guards";
import { categoryAdminService } from "@/services/admin/category.service";
import { CategoryOrderManager } from "./CategoryOrderManager";

/**
 * Category Ordering — Admin. Drag-and-drop reordering over the
 * EXISTING category list/sortOrder field (see
 * src/services/admin/category.service.ts's `reorderCategories`) — the
 * saved order controls both the homepage's first-6 grid and the full
 * /categories page, since both already read the same `sortOrder`
 * column via the same `orderBy`.
 */
export default async function AdminCategoryOrderPage() {
  await requirePermission("categories:view");
  const categories = await categoryAdminService.listCategories();

  return <CategoryOrderManager initialCategories={categories} />;
}
