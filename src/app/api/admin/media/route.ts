import { NextResponse } from "next/server";
import { requirePermission } from "@/auth/guards";
import { MEDIA_MANAGE_PERMISSION } from "@/auth/permissions";
import {
  mediaLibraryAdminService,
  MediaLibraryServiceError,
  mediaLibraryServiceErrorStatus,
} from "@/services/admin/media-library.service";
import type { ApiError } from "@/types/domain";

/**
 * Media Library — upload a new image (Admin only).
 *
 * File uploads follow the SAME route-handler pattern already
 * established for end-user uploads (see src/app/api/media/avatar/route.ts
 * and src/app/api/media/requests/[requestId]/route.ts) rather than a
 * server action — this codebase's convention for anything that needs
 * to parse multipart `FormData`/`File` data. Everything else in the
 * Media Library (list, usage check, delete) goes through the regular
 * server-action pattern in ./actions.ts, matching the rest of the
 * Admin CMS.
 */
export async function POST(request: Request) {
  const session = await requirePermission(MEDIA_MANAGE_PERMISSION);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    const error: ApiError = { code: "VALIDATION_ERROR", message: "لم يتم إرفاق أي ملف صورة." };
    return NextResponse.json({ error }, { status: 400 });
  }
  const altText = formData?.get("altText");

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const media = await mediaLibraryAdminService.uploadMedia(
      { buffer, size: file.size, type: file.type },
      typeof altText === "string" ? altText : null,
      session.userId
    );
    return NextResponse.json({ data: media }, { status: 201 });
  } catch (err) {
    if (err instanceof MediaLibraryServiceError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: mediaLibraryServiceErrorStatus(err.code) });
    }
    console.error("POST /api/admin/media", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "تعذر رفع الصورة." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
