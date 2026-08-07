import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth/auth";
import { offerService, OfferServiceError, offerServiceErrorStatus } from "@/services/offer.service";
import type { ApiError } from "@/types/domain";

/**
 * Offers module (Stage 1): the supplier withdraws their own PENDING
 * offer — used by the "عروضي" (/my-offers) dashboard page.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to withdraw an offer." };
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const withdrawn = await offerService.withdraw(id, session.user.id);
    revalidatePath(`/requests/${withdrawn.requestId}`);
    revalidatePath("/my-offers");
    return NextResponse.json({ data: withdrawn }, { status: 200 });
  } catch (err) {
    if (err instanceof OfferServiceError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: offerServiceErrorStatus(err.code) });
    }
    console.error("POST /api/offers/[id]/withdraw", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not withdraw the offer." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
