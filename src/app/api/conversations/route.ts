import { NextResponse } from "next/server";
import { auth } from "@/auth/auth";
import { conversationService } from "@/services/conversation.service";
import type { ApiError } from "@/types/domain";

/**
 * Workflow Integration phase: list every conversation the signed-in
 * user is a participant of, newest-activity first.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to view conversations." };
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const items = await conversationService.listMine(session.user.id);
    return NextResponse.json({ data: items }, { status: 200 });
  } catch (err) {
    console.error("GET /api/conversations", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not load conversations." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
