import { NextResponse } from "next/server";
import { auth } from "@/auth/auth";
import { requestService, RequestServiceError, requestServiceErrorStatus } from "@/services/request.service";
import type { ApiError } from "@/types/domain";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to publish a request." };
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const updated = await requestService.publish(id, session.user.id);
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    if (err instanceof RequestServiceError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: requestServiceErrorStatus(err.code) });
    }
    console.error("POST /api/requests/[id]/publish", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not publish the request." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
