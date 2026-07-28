import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/auth/guards";
import { MEDIA_MANAGE_PERMISSION } from "@/auth/permissions";
import {
  mediaLibraryAdminService,
  MediaLibraryServiceError,
  mediaLibraryServiceErrorStatus,
} from "@/services/admin/media-library.service";
import type { ApiError } from "@/types/domain";

/**
 * Media Library — replace the underlying image asset of an EXISTING
 * `Media` row (Admin only). Same multipart-`FormData` route-handler
 * pattern as src/app/api/admin/media/route.ts (upload) and the
 * existing end-user upload routes — see that file's docstring.
 *
 * The row's `id` never changes, so every existing reference to it
 * (a category icon, a homepage stat icon, a static page's SEO image,
 * etc.) keeps working automatically — see
 * MediaLibraryAdminService.replaceMedia's docstring for the full
 * explanation.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission(MEDIA_MANAGE_PERMISSION);
  const { id } = await params;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    const error: ApiError = { code: "VALIDATION_ERROR", message: "لم يتم إرفاق أي ملف صورة." };
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const media = await mediaLibraryAdminService.replaceMedia(
      id,
      {
        buffer,
        size: file.size,
        type: file.type,
      },
      session.userId
    );
    revalidatePath("/admin/media");
    revalidatePath("/");
    return NextResponse.json({ data: media }, { status: 200 });
  } catch (err) {
    if (err instanceof MediaLibraryServiceError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: mediaLibraryServiceErrorStatus(err.code) });
    }
    console.error("POST /api/admin/media/[id]", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "تعذر استبدال الصورة." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
