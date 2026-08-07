import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth/auth";
import { offerService, OfferServiceError, offerServiceErrorStatus } from "@/services/offer.service";
import type { ApiError } from "@/types/domain";

/**
 * Offers module (Stage 1): the buyer (request owner) accepts a
 * PENDING offer. Runs the Offer->ACCEPTED / Request->IN_PROGRESS /
 * Conversation transaction in OfferService.accept — this route is
 * intentionally thin, same shape as
 * src/app/api/requests/[id]/close/route.ts.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to accept an offer." };
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const accepted = await offerService.accept(id, session.user.id);
    revalidatePath(`/requests/${accepted.requestId}`);
    revalidatePath("/my-requests");
    return NextResponse.json({ data: accepted }, { status: 200 });
  } catch (err) {
    if (err instanceof OfferServiceError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: offerServiceErrorStatus(err.code) });
    }
    console.error("POST /api/offers/[id]/accept", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not accept the offer." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
