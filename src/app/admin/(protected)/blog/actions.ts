"use server";

/**
 * Server actions backing the Blog CMS screen
 * (src/app/admin/(protected)/blog/page.tsx + BlogManager.tsx). Same
 * thin-wrapper shape as every other CMS actions.ts in this codebase
 * (categories/homepage/pages/localization/currencies/seo/settings):
 * authorize, call the admin service, map the result to a small
 * serializable state object, revalidate the affected routes.
 *
 * Mutations require `BLOG_MANAGE_PERMISSION` (ADMIN only); reads
 * require `blog:view` (also ADMIN only, unchanged since Checkpoint 01).
 */

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/auth/guards";
import { BLOG_MANAGE_PERMISSION } from "@/auth/permissions";
import {
  blogAdminService,
  BlogServiceError,
  type BlogPostInput,
  type UpdateBlogPostInput,
  type BlogPostStatusValue,
  type ListBlogPostsFilters,
} from "@/services/admin/blog.service";

export interface BlogActionState {
  success: boolean;
  error?: string;
}

function toActionState(err: unknown): BlogActionState {
  if (err instanceof BlogServiceError) {
    return { success: false, error: err.message };
  }
  console.error("[admin/blog] unexpected error", err);
  return { success: false, error: "حدث خطأ غير متوقع. حاول مرة أخرى." };
}

/** Blog posts are also publicly browsable (src/app/blog) — revalidate
 * that whole subtree (listing + every article page) in addition to
 * the Admin screen, so a save/publish/delete shows up immediately
 * everywhere, matching the exact convention Categories/Static Pages/
 * Homepage already follow. */
function revalidateBlogRoutes(): void {
  revalidatePath("/admin/blog");
  revalidatePath("/blog", "layout");
}

export async function listBlogPostsAction(filters?: ListBlogPostsFilters) {
  await requirePermission("blog:view");
  return blogAdminService.listPosts(filters);
}

export async function getBlogPostAction(id: string) {
  await requirePermission("blog:view");
  return blogAdminService.getPost(id);
}

export async function createBlogPostAction(input: BlogPostInput): Promise<BlogActionState> {
  const session = await requirePermission(BLOG_MANAGE_PERMISSION);
  try {
    await blogAdminService.createPost(input, session.userId);
    revalidateBlogRoutes();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function updateBlogPostAction(id: string, input: UpdateBlogPostInput): Promise<BlogActionState> {
  const session = await requirePermission(BLOG_MANAGE_PERMISSION);
  try {
    await blogAdminService.updatePost(id, input, session.userId);
    revalidateBlogRoutes();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function setBlogPostStatusAction(id: string, status: BlogPostStatusValue): Promise<BlogActionState> {
  const session = await requirePermission(BLOG_MANAGE_PERMISSION);
  try {
    await blogAdminService.setStatus(id, status, session.userId);
    revalidateBlogRoutes();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function deleteBlogPostAction(id: string): Promise<BlogActionState> {
  const session = await requirePermission(BLOG_MANAGE_PERMISSION);
  try {
    await blogAdminService.deletePost(id, session.userId);
    revalidateBlogRoutes();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}
