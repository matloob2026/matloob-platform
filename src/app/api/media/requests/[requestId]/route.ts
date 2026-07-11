import { NextResponse } from "next/server";
import { auth } from "@/auth/auth";
import { mediaService, MediaServiceError, mediaServiceErrorStatus } from "@/services/media.service";
import type { ApiError } from "@/types/domain";

export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to upload images." };
    return NextResponse.json({ error }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    const error: ApiError = { code: "VALIDATION_ERROR", message: "No image file was provided." };
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const media = await mediaService.addRequestImage(requestId, session.user.id, {
      buffer,
      size: file.size,
      type: file.type,
    });
    return NextResponse.json({ data: media }, { status: 201 });
  } catch (err) {
    if (err instanceof MediaServiceError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: mediaServiceErrorStatus(err.code) });
    }
    console.error("POST /api/media/requests/[requestId]", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not upload the image." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
