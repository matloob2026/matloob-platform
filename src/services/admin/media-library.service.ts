/**
 * MediaLibraryAdminService
 * =========================
 * Media Library completion. Reuses the EXISTING `Media` model
 * (prisma/schema.prisma) and the EXISTING Cloudinary upload/delete
 * primitives already used by the real end-user upload flows
 * (src/services/media.service.ts / src/lib/cloudinary.ts) — no new
 * model, no migration, no duplicate upload/storage system.
 *
 * Every image already used anywhere on the platform (request
 * galleries, category icons/images, homepage hero/stats/trust badges,
 * static-page/SEO images, profile avatars, or a plain admin upload) is
 * the SAME `Media` table this service manages — the Admin Media
 * Library is a real, single source of truth, not a parallel system.
 *
 * SAFE DELETE / USAGE DETECTION: `getMediaUsage` checks every relation
 * that can point at a `Media` row (see the schema comment on `Media`
 * itself) and returns a human-readable list of exactly where an image
 * is used. `deleteMedia` refuses when that list is non-empty UNLESS
 * the caller passes `force: true` (the Admin UI only offers `force`
 * after showing the admin that exact usage list and asking them to
 * confirm explicitly) — this task intentionally allows an informed
 * override here, unlike Categories/Countries/Cities/Currencies, which
 * always hard-block.
 *
 * REPLACE: uploads the new file to Cloudinary as a new asset, then
 * updates the EXISTING `Media` row's url/cloudinaryPublicId/
 * width/height/etc. in place (same `id`) — every foreign key that
 * already points at this row (Category.iconMediaId, PageContent.
 * mediaId, HomepageStat.iconMediaId, TrustBadge.iconMediaId,
 * SeoSetting.ogImageMediaId, UserProfile.avatarMediaId, the Request/
 * Message many-to-many) keeps working unchanged, because none of them
 * ever needs to change — they reference the row by id, not by URL.
 * The old Cloudinary asset is destroyed only after the row update
 * succeeds (best-effort, non-fatal — mirrors
 * MediaService.deleteImage's existing tolerance of Cloudinary errors).
 *
 * Reuses `MAX_IMAGE_BYTES`/`ALLOWED_MIME_TYPES` from
 * src/services/media.service.ts rather than redefining validation
 * limits in a second place (`assertValidImageFile` below re-checks the
 * same values but throws THIS service's own `MediaLibraryServiceError`
 * — media.service.ts's own validator is a private, unexported helper
 * tied to its own `MediaServiceError`, so it isn't imported directly).
 *
 * Follows the exact conventions established in
 * src/services/admin/category.service.ts: a typed
 * `MediaLibraryServiceError`, type-only `Prisma.TransactionClient`
 * import, `undefined` (never `null`) for empty Json audit fields,
 * actor-exists-gated `AdminAuditLog` rows.
 *
 * VERIFICATION NOTE: same sandbox limitation documented in
 * category.service.ts — `prisma generate` cannot complete here
 * because the network proxy blocks binaries.prisma.sh.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { uploadImage, destroyImage, isCloudinaryConfigured, CloudinaryError } from "@/lib/cloudinary";
import { MAX_IMAGE_BYTES, ALLOWED_MIME_TYPES } from "@/services/media.service";

/** Mirrors `enum MediaOwnerType` in prisma/schema.prisma exactly. A
 * plain `string` here would compile in this sandbox (no generated
 * Prisma client to check against — see the class docstring's
 * VERIFICATION NOTE) but would fail to satisfy the real generated
 * enum-typed `where` filter once built with a real client (e.g. on
 * Vercel) — the same class of bug already hit and fixed in
 * src/services/admin/seo.service.ts this session. Using the literal
 * union here instead avoids that regardless of which client is
 * loaded. */
export type MediaOwnerTypeValue =
  | "REQUEST"
  | "USER_PROFILE"
  | "CATEGORY"
  | "PAGE_CONTENT"
  | "HOMEPAGE_HERO"
  | "SITE_LOGO"
  | "ADMIN_UPLOAD";

export class MediaLibraryServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION_ERROR" | "IN_USE" | "UPLOAD_FAILED" | "NOT_CONFIGURED"
  ) {
    super(message);
    this.name = "MediaLibraryServiceError";
  }
}

export function mediaLibraryServiceErrorStatus(code: MediaLibraryServiceError["code"]): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "IN_USE":
      return 409;
    case "UPLOAD_FAILED":
      return 502;
    case "NOT_CONFIGURED":
      return 503;
    case "VALIDATION_ERROR":
    default:
      return 400;
  }
}

function assertValidImageFile(file: { size: number; type: string }): void {
  if (!isCloudinaryConfigured()) {
    throw new MediaLibraryServiceError("رفع الصور غير مُفعّل حالياً على الخادم. حاول لاحقاً.", "NOT_CONFIGURED");
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new MediaLibraryServiceError("يُسمح فقط بصور من نوع JPEG أو PNG أو WEBP أو GIF.", "VALIDATION_ERROR");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new MediaLibraryServiceError(
      `حجم الصورة كبير جداً — الحد الأقصى ${MAX_IMAGE_BYTES / (1024 * 1024)}MB.`,
      "VALIDATION_ERROR"
    );
  }
}

export interface AdminMediaItem {
  id: string;
  url: string;
  altText: string | null;
  ownerType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  mimeType: string | null;
  createdAt: Date;
  /** Quick, cheap usage indicator for the grid — the exact list is
   * only fetched (via getMediaUsage) when the admin tries to delete. */
  isReferenced: boolean;
}

export interface MediaUsageItem {
  /** A short, human-readable category — e.g. "أيقونة تصنيف". */
  type: string;
  /** The specific thing using it — e.g. a category or page name. */
  label: string;
}

interface MediaRecord {
  id: string;
  ownerType: string;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  mimeType: string | null;
  createdAt: Date;
  _count: {
    requests: number;
    messages: number;
    categoryIcons: number;
    categoryImages: number;
    userProfiles: number;
    pageContents: number;
    homepageStats: number;
    trustBadges: number;
    seoSettings: number;
  };
}

const MEDIA_INCLUDE = {
  _count: {
    select: {
      requests: true,
      messages: true,
      categoryIcons: true,
      categoryImages: true,
      userProfiles: true,
      pageContents: true,
      homepageStats: true,
      trustBadges: true,
      seoSettings: true,
    },
  },
};

function isReferenced(counts: MediaRecord["_count"]): boolean {
  return Object.values(counts).some((count) => count > 0);
}

function toListItem(media: MediaRecord): AdminMediaItem {
  return {
    id: media.id,
    url: media.url,
    altText: media.altText,
    ownerType: media.ownerType,
    width: media.width,
    height: media.height,
    sizeBytes: media.sizeBytes,
    mimeType: media.mimeType,
    createdAt: media.createdAt,
    isReferenced: isReferenced(media._count),
  };
}

async function actorExists(actorId: string): Promise<boolean> {
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { id: true } });
  return Boolean(actor);
}

function warnAuditSkipped(action: string, entityId: string, actorId: string): void {
  console.warn(
    `[AdminAuditLog] skipped for action=${action} entityId=${entityId} — ` +
      `actor "${actorId}" has no matching User row (Phase 2 mock admin session). ` +
      `Will resume once real admin accounts are wired up.`
  );
}

export class MediaLibraryAdminService {
  async listMedia(filters?: { search?: string; ownerType?: MediaOwnerTypeValue }): Promise<AdminMediaItem[]> {
    const media = await prisma.media.findMany({
      where: {
        deletedAt: null,
        ...(filters?.ownerType ? { ownerType: filters.ownerType } : {}),
        ...(filters?.search
          ? { altText: { contains: filters.search, mode: "insensitive" as const } }
          : {}),
      },
      include: MEDIA_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return media.map((m: MediaRecord) => toListItem(m));
  }

  /** The specific, human-readable list of everywhere an image is used
   * — shown to the admin before an in-use image can be deleted. */
  async getMediaUsage(mediaId: string): Promise<MediaUsageItem[]> {
    const media = await prisma.media.findFirst({ where: { id: mediaId, deletedAt: null } });
    if (!media) {
      throw new MediaLibraryServiceError("الصورة غير موجودة.", "NOT_FOUND");
    }

    const [requestCount, messageCount, categories, homepageStats, trustBadges, pageContents, seoSettings, profiles] =
      await Promise.all([
        prisma.request.count({ where: { media: { some: { id: mediaId } } } }),
        prisma.message.count({ where: { attachments: { some: { id: mediaId } } } }),
        prisma.category.findMany({
          where: { OR: [{ iconMediaId: mediaId }, { imageMediaId: mediaId }] },
          include: { translations: true },
        }),
        prisma.homepageStat.findMany({ where: { iconMediaId: mediaId }, include: { translations: true } }),
        prisma.trustBadge.findMany({ where: { iconMediaId: mediaId }, include: { translations: true } }),
        prisma.pageContent.findMany({ where: { mediaId }, select: { page: true, section: true, locale: true } }),
        prisma.seoSetting.findMany({
          where: { ogImageMediaId: mediaId },
          select: { entityType: true, entityId: true, locale: true },
        }),
        prisma.userProfile.count({ where: { avatarMediaId: mediaId } }),
      ]);

    const usage: MediaUsageItem[] = [];

    if (requestCount > 0) {
      usage.push({ type: "طلبات", label: `مستخدمة في ${requestCount.toLocaleString("ar")} طلب` });
    }
    if (messageCount > 0) {
      usage.push({ type: "رسائل", label: `مرفقة في ${messageCount.toLocaleString("ar")} رسالة` });
    }
    for (const category of categories as {
      id: string;
      iconMediaId: string | null;
      translations: { locale: string; name: string }[];
    }[]) {
      const name = category.translations.find((t) => t.locale === "ar")?.name ?? category.translations[0]?.name ?? "";
      const role = category.iconMediaId === mediaId ? "أيقونة" : "صورة";
      usage.push({ type: "تصنيف", label: `${role} تصنيف "${name}"` });
    }
    for (const stat of homepageStats as { translations: { locale: string; label: string }[] }[]) {
      const label = stat.translations.find((t) => t.locale === "ar")?.label ?? stat.translations[0]?.label ?? "";
      usage.push({ type: "الصفحة الرئيسية", label: `أيقونة إحصائية "${label}"` });
    }
    for (const badge of trustBadges as { translations: { locale: string; label: string }[] }[]) {
      const label = badge.translations.find((t) => t.locale === "ar")?.label ?? badge.translations[0]?.label ?? "";
      usage.push({ type: "الصفحة الرئيسية", label: `أيقونة شارة ثقة "${label}"` });
    }
    for (const page of pageContents as { page: string; section: string; locale: string }[]) {
      usage.push({ type: "صفحة", label: `صفحة "${page.page}" (${page.section}, ${page.locale})` });
    }
    for (const seo of seoSettings as { entityType: string; entityId: string; locale: string }[]) {
      const entityLabel = seo.entityId ? seo.entityId : "عام";
      usage.push({ type: "SEO", label: `صورة Open Graph لـ ${seo.entityType} (${entityLabel})` });
    }
    if (profiles > 0) {
      usage.push({ type: "ملفات شخصية", label: `الصورة الشخصية لـ ${profiles.toLocaleString("ar")} مستخدم` });
    }

    return usage;
  }

  async uploadMedia(
    file: { buffer: Buffer; size: number; type: string },
    altText: string | null,
    actorId: string
  ): Promise<AdminMediaItem> {
    assertValidImageFile(file);

    let uploaded;
    try {
      uploaded = await uploadImage(file.buffer, { folder: "matloob/admin-uploads" });
    } catch (err) {
      if (err instanceof CloudinaryError) throw new MediaLibraryServiceError(err.message, "UPLOAD_FAILED");
      throw err;
    }

    const hasRealActor = await actorExists(actorId);

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const media = await tx.media.create({
        data: {
          ownerType: "ADMIN_UPLOAD",
          url: uploaded.url,
          cloudinaryPublicId: uploaded.publicId,
          altText: altText?.trim() || null,
          width: uploaded.width,
          height: uploaded.height,
          sizeBytes: uploaded.bytes ?? file.size,
          mimeType: file.type,
          uploadedById: hasRealActor ? actorId : null,
        },
        include: MEDIA_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "UPLOAD_MEDIA",
            entityType: "Media",
            entityId: media.id,
            before: undefined,
            after: { url: media.url, ownerType: media.ownerType },
          },
        });
      } else {
        warnAuditSkipped("UPLOAD_MEDIA", media.id, actorId);
      }

      return media;
    });

    return toListItem(created);
  }

  /**
   * Replaces the underlying image asset for an EXISTING Media row —
   * the row's `id` never changes, so every existing reference to it
   * (a category's icon, a homepage stat's icon, a static page's SEO
   * image, etc.) keeps working automatically. See class docstring.
   */
  async replaceMedia(
    mediaId: string,
    file: { buffer: Buffer; size: number; type: string },
    actorId: string
  ): Promise<AdminMediaItem> {
    assertValidImageFile(file);

    const before = await prisma.media.findFirst({ where: { id: mediaId, deletedAt: null } });
    if (!before) {
      throw new MediaLibraryServiceError("الصورة غير موجودة.", "NOT_FOUND");
    }

    let uploaded;
    try {
      uploaded = await uploadImage(file.buffer, { folder: "matloob/admin-uploads" });
    } catch (err) {
      if (err instanceof CloudinaryError) throw new MediaLibraryServiceError(err.message, "UPLOAD_FAILED");
      throw err;
    }

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const media = await tx.media.update({
        where: { id: mediaId },
        data: {
          url: uploaded.url,
          cloudinaryPublicId: uploaded.publicId,
          width: uploaded.width,
          height: uploaded.height,
          sizeBytes: uploaded.bytes ?? file.size,
          mimeType: file.type,
        },
        include: MEDIA_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "REPLACE_MEDIA",
            entityType: "Media",
            entityId: mediaId,
            before: { url: before.url },
            after: { url: media.url },
          },
        });
      } else {
        warnAuditSkipped("REPLACE_MEDIA", mediaId, actorId);
      }

      return media;
    });

    // Best-effort cleanup of the old asset — never blocks the
    // replace from having already succeeded (mirrors
    // MediaService.deleteImage's existing tolerance).
    if (before.cloudinaryPublicId) {
      try {
        await destroyImage(before.cloudinaryPublicId);
      } catch (err) {
        if (!(err instanceof CloudinaryError)) throw err;
      }
    }

    return toListItem(updated);
  }

  /**
   * Safe delete with an informed override: refuses when
   * `getMediaUsage` finds any reference, UNLESS `force` is explicitly
   * passed — the Admin UI only sets `force: true` after showing the
   * admin the exact usage list and asking them to confirm. This is a
   * deliberately different (softer) rule than Categories/Countries/
   * Cities/Currencies, which always hard-block — see class docstring.
   */
  async deleteMedia(mediaId: string, actorId: string, force = false): Promise<void> {
    const media = await prisma.media.findFirst({ where: { id: mediaId, deletedAt: null } });
    if (!media) {
      throw new MediaLibraryServiceError("الصورة غير موجودة.", "NOT_FOUND");
    }

    if (!force) {
      const usage = await this.getMediaUsage(mediaId);
      if (usage.length > 0) {
        throw new MediaLibraryServiceError(
          "هذه الصورة مستخدمة حالياً في أماكن أخرى على المنصة. راجع أماكن الاستخدام وأكّد الحذف صراحةً إذا كنت متأكداً.",
          "IN_USE"
        );
      }
    }

    const hasRealActor = await actorExists(actorId);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.media.update({ where: { id: mediaId }, data: { deletedAt: new Date() } });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "DELETE_MEDIA",
            entityType: "Media",
            entityId: mediaId,
            before: { url: media.url, ownerType: media.ownerType },
            after: undefined,
          },
        });
      } else {
        warnAuditSkipped("DELETE_MEDIA", mediaId, actorId);
      }
    });

    if (media.cloudinaryPublicId) {
      try {
        await destroyImage(media.cloudinaryPublicId);
      } catch (err) {
        if (!(err instanceof CloudinaryError)) throw err;
      }
    }
  }
}

export const mediaLibraryAdminService = new MediaLibraryAdminService();

// Re-exported for the Admin actions layer so it never has to import
// from the end-user-facing media.service.ts directly.
export { MAX_IMAGE_BYTES, ALLOWED_MIME_TYPES };
