import { requirePermission } from "@/auth/guards";
import { categoryAdminService } from "@/services/admin/category.service";
import { CategoriesManager } from "./CategoriesManager";

/**
 * Categories CMS management — Checkpoint 01's first real,
 * database-backed content-management screen. `requirePermission`
 * ensures only an authenticated ADMIN session reaches this page (the
 * "categories:view" permission is not granted to MODERATOR — see
 * src/auth/permissions.ts), on top of the session check every admin
 * route already gets from the protected layout.
 *
 * Data is fetched once here (server component) and handed to the
 * interactive client component below; mutations go through the server
 * actions in ./actions.ts, which re-validate the same permission
 * server-side before touching the database.
 */
export default async function AdminCategoriesPage() {
  await requirePermission("categories:view");
  const categories = await categoryAdminService.listCategories();

  return <CategoriesManager initialCategories={categories} />;
}
