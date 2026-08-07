import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth/auth";
import { offerService, OfferServiceError, offerServiceErrorStatus } from "@/services/offer.service";
import type { ApiError } from "@/types/domain";

/**
 * Offers module (Stage 1): the buyer (request owner) rejects a
 * PENDING offer. Same shape as the accept route above.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to reject an offer." };
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const rejected = await offerService.reject(id, session.user.id);
    revalidatePath(`/requests/${rejected.requestId}`);
    return NextResponse.json({ data: rejected }, { status: 200 });
  } catch (err) {
    if (err instanceof OfferServiceError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: offerServiceErrorStatus(err.code) });
    }
    console.error("POST /api/offers/[id]/reject", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not reject the offer." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
