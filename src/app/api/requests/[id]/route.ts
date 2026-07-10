import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth/auth";
import { requestService, RequestServiceError, requestServiceErrorStatus } from "@/services/request.service";
import type { ApiError } from "@/types/domain";

const UpdateRequestSchema = z.object({
  categoryId: z.string().min(1).optional(),
  cityId: z.string().min(1).optional(),
  currencyId: z.string().min(1).optional(),
  title: z.string().trim().min(5).max(120).optional(),
  description: z.string().trim().min(20).max(4000).optional(),
  budgetMin: z.number().nonnegative().nullable().optional(),
  budgetMax: z.number().nonnegative().nullable().optional(),
});

/**
 * Request Details: public for a PUBLISHED (or later-stage) request, but
 * a DRAFT is only visible to its own owner — this is the one place
 * visibility depends on the viewer's identity, so it lives at the
 * route layer rather than in RequestService.getById (which has no
 * notion of "who's asking").
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const found = await requestService.getById(id);
  if (!found) {
    const error: ApiError = { code: "NOT_FOUND", message: "Request not found." };
    return NextResponse.json({ error }, { status: 404 });
  }

  if (found.status === "DRAFT") {
    const session = await auth();
    if (session?.user?.id !== found.owner.id) {
      const error: ApiError = { code: "NOT_FOUND", message: "Request not found." };
      return NextResponse.json({ error }, { status: 404 });
    }
  }

  return NextResponse.json({ data: found }, { status: 200 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to edit a request." };
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = UpdateRequestSchema.safeParse(body);
  if (!parsed.success) {
    const error: ApiError = {
      code: "VALIDATION_ERROR",
      message: "Please check the submitted fields and try again.",
      details: parsed.error.flatten().fieldErrors,
    };
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const updated = await requestService.update(id, session.user.id, parsed.data);
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    if (err instanceof RequestServiceError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: requestServiceErrorStatus(err.code) });
    }
    console.error("PATCH /api/requests/[id]", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not update the request." };
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to delete a request." };
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    await requestService.remove(id, session.user.id);
    return NextResponse.json({ data: { deleted: true } }, { status: 200 });
  } catch (err) {
    if (err instanceof RequestServiceError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: requestServiceErrorStatus(err.code) });
    }
    console.error("DELETE /api/requests/[id]", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not delete the request." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
