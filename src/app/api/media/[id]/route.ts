import { NextResponse } from "next/server";
import { auth } from "@/auth/auth";
import { mediaService, MediaServiceError, mediaServiceErrorStatus } from "@/services/media.service";
import type { ApiError } from "@/types/domain";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to delete images." };
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    await mediaService.deleteImage(id, session.user.id);
    return NextResponse.json({ data: { deleted: true } }, { status: 200 });
  } catch (err) {
    if (err instanceof MediaServiceError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: mediaServiceErrorStatus(err.code) });
    }
    console.error("DELETE /api/media/[id]", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not delete the image." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
