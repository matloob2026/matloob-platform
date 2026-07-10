import { NextResponse } from "next/server";
import { auth } from "@/auth/auth";
import { requestService } from "@/services/request.service";
import type { ApiError, RequestStatus } from "@/types/domain";

const VALID_STATUSES: RequestStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "IN_PROGRESS",
  "FULFILLED",
  "EXPIRED",
  "CLOSED_BY_BUYER",
  "REMOVED_BY_ADMIN",
];

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to view your requests." };
    return NextResponse.json({ error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status = VALID_STATUSES.includes(statusParam as RequestStatus)
    ? (statusParam as RequestStatus)
    : undefined;
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(searchParams.get("pageSize") ?? "20") || 20;

  try {
    const result = await requestService.listMine(session.user.id, { status, page, pageSize });
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (err) {
    console.error("GET /api/requests/mine", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not load your requests." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
