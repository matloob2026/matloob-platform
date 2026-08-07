import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth/auth";
import { offerService, OfferServiceError, offerServiceErrorStatus } from "@/services/offer.service";
import type { ApiError } from "@/types/domain";

/**
 * Offers module: the buyer (request owner) accepts a PENDING offer.
 * Runs the full accept transaction in OfferService.accept — offer
 * ACCEPTED, request IN_PROGRESS, every competing PENDING offer
 * auto-REJECTED, conversation opened, first system message, and every
 * notification — this route is intentionally thin, same shape as
 * src/app/api/requests/[id]/close/route.ts.
 *
 * Workflow Integration phase: the response now also carries
 * `conversationId` so the client can redirect the buyer straight into
 * the newly-opened conversation (item 2's "redirect both parties").
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to accept an offer." };
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const { offer: accepted, conversationId } = await offerService.accept(id, session.user.id);
    revalidatePath(`/requests/${accepted.requestId}`);
    revalidatePath("/my-requests");
    revalidatePath("/my-offers");
    revalidatePath(`/conversations/${conversationId}`);
    return NextResponse.json({ data: { ...accepted, conversationId } }, { status: 200 });
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
