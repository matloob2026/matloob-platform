/**
 * MediaService
 * ============
 * Owns image upload/delete/reorder for the two surfaces this phase
 * covers: request image galleries and profile avatars. Route handlers
 * (src/app/api/media/**) stay thin — parse the multipart request,
 * check auth, call this service.
 *
 * All uploads are validated here (size + mime type) BEFORE anything is
 * sent to Cloudinary, and every mutation takes the requesting user's id
 * so ownership can be enforced in one place — no route re-implements
 * these checks.
 */

import { prisma } from "@/lib/prisma";
import { uploadImage, destroyImage, isCloudinaryConfigured, CloudinaryError } from "@/lib/cloudinary";

export class MediaServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_CONFIGURED" | "VALIDATION_ERROR" | "NOT_FOUND" | "FORBIDDEN" | "UPLOAD_FAILED"
  ) {
    super(message);
    this.name = "MediaServiceError";
  }
}

export function mediaServiceErrorStatus(code: MediaServiceError["code"]): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "FORBIDDEN":
      return 403;
    case "NOT_CONFIGURED":
      return 503;
    case "UPLOAD_FAILED":
      return 502;
    case "VALIDATION_ERROR":
    default:
      return 400;
  }
}

// --- Validation ---------------------------------------------------
// Requirements: "Maximum file size", "Allowed image types".
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const MAX_REQUEST_IMAGES = 10;

function assertValidImage(file: { size: number; type: string }) {
  if (!isCloudinaryConfigured()) {
    throw new MediaServiceError(
      "Image upload is not configured yet. Please try again later.",
      "NOT_CONFIGURED"
    );
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new MediaServiceError(
      "Only JPEG, PNG, WEBP, or GIF images are allowed.",
      "VALIDATION_ERROR"
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new MediaServiceError(
      `Image is too large — the maximum size is ${MAX_IMAGE_BYTES / (1024 * 1024)}MB.`,
      "VALIDATION_ERROR"
    );
  }
}

export interface MediaSummary {
  id: string;
  url: string;
  sortOrder: number;
}

export class MediaService {
  /**
   * Upload one image and attach it to a request's gallery. Ownership
   * (only the request's owner may add images) and the max-images-per-
   * request cap are both enforced here, not at the route layer.
   */
  async addRequestImage(
    requestId: string,
    ownerId: string,
    file: { buffer: Buffer; size: number; type: string }
  ): Promise<MediaSummary> {
    assertValidImage(file);

    const request = await prisma.request.findFirst({
      where: { id: requestId, deletedAt: null },
      select: { ownerId: true, _count: { select: { media: true } } },
    });
    if (!request || request.ownerId !== ownerId) {
      throw new MediaServiceError("Request not found.", "NOT_FOUND");
    }
    if (request._count.media >= MAX_REQUEST_IMAGES) {
      throw new MediaServiceError(
        `A request can have at most ${MAX_REQUEST_IMAGES} images.`,
        "VALIDATION_ERROR"
      );
    }

    let uploaded;
    try {
      uploaded = await uploadImage(file.buffer, { folder: `matloob/requests/${requestId}` });
    } catch (err) {
      if (err instanceof CloudinaryError) throw new MediaServiceError(err.message, "UPLOAD_FAILED");
      throw err;
    }

    const maxSortOrder = await prisma.media.aggregate({
      where: { requests: { some: { id: requestId } } },
      _max: { sortOrder: true },
    });

    const media = await prisma.media.create({
      data: {
        ownerType: "REQUEST",
        url: uploaded.url,
        cloudinaryPublicId: uploaded.publicId,
        width: uploaded.width,
        height: uploaded.height,
        sizeBytes: uploaded.bytes ?? file.size,
        mimeType: file.type,
        uploadedById: ownerId,
        sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
        requests: { connect: { id: requestId } },
      },
    });

    return { id: media.id, url: media.url, sortOrder: media.sortOrder };
  }

  /**
   * Persist a new display order for a request's images. `orderedIds`
   * must be exactly the set of media ids currently on the request —
   * anything else is rejected rather than silently partially applied.
   */
  async reorderRequestImages(requestId: string, ownerId: string, orderedIds: string[]): Promise<void> {
    const request = await prisma.request.findFirst({
      where: { id: requestId, deletedAt: null },
      select: { ownerId: true, media: { select: { id: true } } },
    });
    if (!request || request.ownerId !== ownerId) {
      throw new MediaServiceError("Request not found.", "NOT_FOUND");
    }

    const currentIds = new Set(request.media.map((m: { id: string }) => m.id));
    const sameSet =
      orderedIds.length === currentIds.size && orderedIds.every((id) => currentIds.has(id));
    if (!sameSet) {
      throw new MediaServiceError(
        "The image order must include exactly the request's current images.",
        "VALIDATION_ERROR"
      );
    }

    await prisma.$transaction(
      orderedIds.map((id, index) => prisma.media.update({ where: { id }, data: { sortOrder: index } }))
    );
  }

  /**
   * Delete an image — either from a request's gallery or a profile
   * avatar. Ownership is resolved generically: the caller must either
   * be the user who uploaded it, or own the request it's attached to.
   * Removes the Cloudinary asset first, then the DB row (soft-delete
   * mirrors the rest of the codebase's pattern for Request/Offer).
   */
  async deleteImage(mediaId: string, requestingUserId: string): Promise<void> {
    const media = await prisma.media.findFirst({
      where: { id: mediaId, deletedAt: null },
      include: {
        requests: { select: { ownerId: true } },
        userProfiles: { select: { userId: true } },
      },
    });
    if (!media) throw new MediaServiceError("Image not found.", "NOT_FOUND");

    const isUploader = media.uploadedById === requestingUserId;
    const ownsAttachedRequest = media.requests.some(
      (r: { ownerId: string }) => r.ownerId === requestingUserId
    );
    const isOwnAvatar = media.userProfiles.some(
      (p: { userId: string }) => p.userId === requestingUserId
    );
    if (!isUploader && !ownsAttachedRequest && !isOwnAvatar) {
      throw new MediaServiceError("You don't have permission to delete this image.", "FORBIDDEN");
    }

    if (media.cloudinaryPublicId) {
      try {
        await destroyImage(media.cloudinaryPublicId);
      } catch (err) {
        // Non-fatal: prefer removing it from the app (so it stops
        // showing up) even if the remote delete failed — logged
        // server-side by destroyImage already.
        if (!(err instanceof CloudinaryError)) throw err;
      }
    }

    await prisma.media.update({ where: { id: mediaId }, data: { deletedAt: new Date() } });
  }

  /**
   * Upload or replace the authenticated user's own profile avatar.
   * Replacing deletes the previous avatar's Cloudinary asset (never
   * leaves orphaned images behind).
   */
  async setAvatar(
    userId: string,
    file: { buffer: Buffer; size: number; type: string }
  ): Promise<MediaSummary> {
    assertValidImage(file);

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { id: true, avatarMediaId: true },
    });
    if (!profile) throw new MediaServiceError("Profile not found.", "NOT_FOUND");

    let uploaded;
    try {
      uploaded = await uploadImage(file.buffer, { folder: `matloob/avatars/${userId}` });
    } catch (err) {
      if (err instanceof CloudinaryError) throw new MediaServiceError(err.message, "UPLOAD_FAILED");
      throw err;
    }

    const media = await prisma.media.create({
      data: {
        ownerType: "USER_PROFILE",
        url: uploaded.url,
        cloudinaryPublicId: uploaded.publicId,
        width: uploaded.width,
        height: uploaded.height,
        sizeBytes: uploaded.bytes ?? file.size,
        mimeType: file.type,
        uploadedById: userId,
      },
    });

    const previousAvatarMediaId = profile.avatarMediaId;
    await prisma.userProfile.update({ where: { userId }, data: { avatarMediaId: media.id } });

    if (previousAvatarMediaId) {
      // Best-effort cleanup of the old avatar; failure here shouldn't
      // block the new avatar from being set.
      try {
        await this.deleteImage(previousAvatarMediaId, userId);
      } catch {
        // already logged inside deleteImage/destroyImage
      }
    }

    return { id: media.id, url: media.url, sortOrder: media.sortOrder };
  }

  /** Remove the user's avatar entirely (no replacement). */
  async removeAvatar(userId: string): Promise<void> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { avatarMediaId: true },
    });
    if (!profile?.avatarMediaId) return; // nothing to remove — no-op, not an error

    await prisma.userProfile.update({ where: { userId }, data: { avatarMediaId: null } });
    await this.deleteImage(profile.avatarMediaId, userId);
  }
}

export const mediaService = new MediaService();
