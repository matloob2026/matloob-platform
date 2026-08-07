import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth/auth";
import { offerService, OfferServiceError, offerServiceErrorStatus } from "@/services/offer.service";
import type { ApiError } from "@/types/domain";

/**
 * Offers module (Stage 1): a supplier submits an Offer on a PUBLISHED
 * Request. Mirrors src/app/api/requests/route.ts's POST handler shape
 * exactly (session check -> zod validation -> service call -> typed
 * error mapping).
 */

const CreateOfferSchema = z.object({
  requestId: z.string().min(1),
  message: z.string().trim().min(5).max(2000),
  price: z.number().nonnegative().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to send an offer." };
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = CreateOfferSchema.safeParse(body);
  if (!parsed.success) {
    const error: ApiError = {
      code: "VALIDATION_ERROR",
      message: "Please check the submitted fields and try again.",
      details: parsed.error.flatten().fieldErrors,
    };
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    // Every offer is associated with the authenticated session's
    // user id, never a client-supplied supplierId.
    const created = await offerService.create({ ...parsed.data, supplierId: session.user.id });
    revalidatePath(`/requests/${parsed.data.requestId}`);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    if (err instanceof OfferServiceError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: offerServiceErrorStatus(err.code) });
    }
    console.error("POST /api/offers", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not send the offer. Please try again." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
