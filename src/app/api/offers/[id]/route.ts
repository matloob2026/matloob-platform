import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth/auth";
import { offerService, OfferServiceError, offerServiceErrorStatus } from "@/services/offer.service";
import type { ApiError } from "@/types/domain";

/**
 * Offers Integration phase: supplier-only edit of their own PENDING
 * offer's message/price — same record, no new offer created. PATCH is
 * the same convention already used for editing a Request (see
 * src/app/api/requests/[id]/route.ts).
 */

const UpdateOfferSchema = z.object({
  message: z.string().trim().min(1).optional(),
  price: z.number().nonnegative().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to edit an offer." };
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = UpdateOfferSchema.safeParse(body);
  if (!parsed.success) {
    const error: ApiError = {
      code: "VALIDATION_ERROR",
      message: "Please check the submitted fields and try again.",
      details: parsed.error.flatten().fieldErrors,
    };
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const updated = await offerService.update(id, session.user.id, parsed.data);
    revalidatePath(`/requests/${updated.requestId}`);
    revalidatePath(`/offers/${id}`);
    revalidatePath("/my-offers");
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    if (err instanceof OfferServiceError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: offerServiceErrorStatus(err.code) });
    }
    console.error("PATCH /api/offers/[id]", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not update the offer." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
