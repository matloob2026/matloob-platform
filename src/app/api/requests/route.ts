import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth/auth";
import { requestService, RequestServiceError, requestServiceErrorStatus } from "@/services/request.service";
import type { ApiError } from "@/types/domain";

const CreateRequestSchema = z.object({
  categoryId: z.string().min(1),
  countryId: z.string().min(1),
  cityId: z.string().min(1).optional(),
  currencyId: z.string().min(1).optional(),
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(4000),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  mediaIds: z.array(z.string()).max(10).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to create a request." };
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = CreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    const error: ApiError = {
      code: "VALIDATION_ERROR",
      message: "Please check the submitted fields and try again.",
      details: parsed.error.flatten().fieldErrors,
    };
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    // Every request is associated with the authenticated session's
    // user id, never a client-supplied ownerId.
    const created = await requestService.create({ ...parsed.data, ownerId: session.user.id });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    if (err instanceof RequestServiceError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: requestServiceErrorStatus(err.code) });
    }
    console.error("POST /api/requests", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not create the request. Please try again." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
