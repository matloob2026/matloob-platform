import { NextResponse } from "next/server";
import { auth } from "@/auth/auth";
import { offerService } from "@/services/offer.service";
import type { ApiError, OfferStatus } from "@/types/domain";

/**
 * Offers module (Stage 1): the supplier-facing "عروضي" dashboard page
 * (/my-offers) reads this — every offer the signed-in user has ever
 * submitted, newest first. Mirrors src/app/api/requests/mine/route.ts.
 */

const VALID_STATUSES: OfferStatus[] = ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN", "EXPIRED"];

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to view your offers." };
    return NextResponse.json({ error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status = VALID_STATUSES.includes(statusParam as OfferStatus) ? (statusParam as OfferStatus) : undefined;
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(searchParams.get("pageSize") ?? "20") || 20;

  try {
    const result = await offerService.listMine(session.user.id, { status, page, pageSize });
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (err) {
    console.error("GET /api/offers/mine", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not load your offers." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
