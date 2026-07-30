import { requirePermission } from "@/auth/guards";
import { blogAdminService } from "@/services/admin/blog.service";
import { categoryAdminService } from "@/services/admin/category.service";
import { BlogManager } from "./BlogManager";

/**
 * Blog CMS management — real, database-backed screen. Replaces the
 * Checkpoint 01 `CmsPlaceholder` that lived at this same route (see
 * src/services/admin/blog.service.ts for the full architecture note:
 * reuses Category/Media/User/SeoSetting, no parallel models).
 *
 * `requirePermission` ensures only an authenticated ADMIN session
 * reaches this page (the "blog:view" permission is not granted to
 * MODERATOR — see src/auth/permissions.ts), on top of the session
 * check every admin route already gets from the protected layout.
 *
 * Categories are fetched here too (reusing the EXISTING
 * `CategoryAdminService` — no second "list categories" query) so the
 * Blog form's category selector has real data to choose from, exactly
 * the same way other CMS screens reuse each other's existing reads.
 */
export default async function AdminBlogPage() {
  await requirePermission("blog:view");
  const [posts, categories] = await Promise.all([
    blogAdminService.listPosts(),
    categoryAdminService.listCategories(),
  ]);

  return <BlogManager initialPosts={posts} categories={categories} />;
}
