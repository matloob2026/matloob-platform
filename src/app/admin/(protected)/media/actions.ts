"use server";

/**
 * Server actions backing the Media Library screen
 * (src/app/admin/(protected)/media/page.tsx + MediaLibraryManager.tsx).
 * Same thin-wrapper shape as every other CMS actions.ts in this
 * codebase (categories/homepage/pages/localization/currencies/seo/
 * settings): authorize, call the admin service, map the result to a
 * small serializable state object, revalidate the affected routes.
 *
 * Upload and Replace are NOT here — they need to parse multipart
 * `FormData`/`File` uploads, which this codebase's convention handles
 * via API route handlers instead of server actions (see
 * src/app/api/admin/media/route.ts and
 * src/app/api/admin/media/[id]/route.ts, mirroring the existing
 * end-user upload routes src/app/api/media/avatar/route.ts and
 * src/app/api/media/requests/[requestId]/route.ts).
 *
 * Reads (`listMediaAction`, `getMediaUsageAction`) require
 * `media:view` (already granted to ADMIN and MODERATOR since
 * Checkpoint 01 — MODERATOR can browse read-only); the delete
 * mutation requires `MEDIA_MANAGE_PERMISSION` (ADMIN only).
 *
 * `listMediaAction` is also imported directly by the reusable
 * `<MediaPicker>` component (src/components/admin/MediaPicker.tsx),
 * used from other Admin CMS screens (e.g. Categories) to let the
 * admin choose an EXISTING Media Library image instead of uploading
 * a new one — same permission, same data, no second list endpoint.
 */

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/auth/guards";
import { MEDIA_MANAGE_PERMISSION } from "@/auth/permissions";
import {
  mediaLibraryAdminService,
  MediaLibraryServiceError,
  type MediaFilterCategory,
} from "@/services/admin/media-library.service";

export interface MediaActionState {
  success: boolean;
  error?: string;
}

function toActionState(err: unknown): MediaActionState {
  if (err instanceof MediaLibraryServiceError) {
    return { success: false, error: err.message };
  }
  console.error("[admin/media] unexpected error", err);
  return { success: false, error: "حدث خطأ غير متوقع. حاول مرة أخرى." };
}

/** Media can be referenced from many public surfaces (homepage,
 * category grids, static pages) — revalidate the Admin screen plus
 * every public route Media currently backs, so a delete/replace shows
 * up immediately everywhere. */
function revalidateMedia(): void {
  revalidatePath("/admin/media");
  revalidatePath("/");
}

/** Also used by the reusable `<MediaPicker>` component (see
 * src/components/admin/MediaPicker.tsx) so any other Admin CMS screen
 * that wants to let the admin choose an EXISTING image reuses this
 * exact same read path — no second "list media" implementation. */
export async function listMediaAction(filters?: { search?: string; category?: MediaFilterCategory }) {
  await requirePermission("media:view");
  return mediaLibraryAdminService.listMedia(filters);
}

export async function getMediaUsageAction(mediaId: string) {
  await requirePermission("media:view");
  return mediaLibraryAdminService.getMediaUsage(mediaId);
}

export async function deleteMediaAction(mediaId: string, force: boolean): Promise<MediaActionState> {
  const session = await requirePermission(MEDIA_MANAGE_PERMISSION);
  try {
    await mediaLibraryAdminService.deleteMedia(mediaId, session.userId, force);
    revalidateMedia();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}
