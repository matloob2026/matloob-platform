import { requirePermission } from "@/auth/guards";
import { mediaLibraryAdminService } from "@/services/admin/media-library.service";
import { MediaLibraryManager } from "./MediaLibraryManager";

/**
 * Media Library — real, database-backed admin screen. Replaces the
 * Checkpoint 01 mock placeholder that lived at this same route.
 * Reuses the existing `Media` model (see
 * src/services/admin/media-library.service.ts for the full
 * architecture note) — no new model, no duplicate upload/storage
 * system.
 *
 * `requirePermission` ensures only an authenticated admin session
 * reaches this page (the "media:view" permission is granted to both
 * ADMIN and MODERATOR, unchanged since Checkpoint 01 — MODERATOR gets
 * read-only browsing; every mutation server action/route re-checks
 * `media:manage`, ADMIN only).
 */
export default async function AdminMediaPage() {
  await requirePermission("media:view");
  const items = await mediaLibraryAdminService.listMedia();

  return <MediaLibraryManager initialItems={items} />;
}
