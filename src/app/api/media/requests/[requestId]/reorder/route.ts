import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth/auth";
import { mediaService, MediaServiceError, mediaServiceErrorStatus } from "@/services/media.service";
import type { ApiError } from "@/types/domain";

const ReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1).max(50),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to reorder images." };
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = ReorderSchema.safeParse(body);
  if (!parsed.success) {
    const error: ApiError = { code: "VALIDATION_ERROR", message: "A list of image ids is required." };
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    await mediaService.reorderRequestImages(requestId, session.user.id, parsed.data.orderedIds);
    return NextResponse.json({ data: { reordered: true } }, { status: 200 });
  } catch (err) {
    if (err instanceof MediaServiceError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: mediaServiceErrorStatus(err.code) });
    }
    console.error("PATCH /api/media/requests/[requestId]/reorder", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not reorder the images." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
