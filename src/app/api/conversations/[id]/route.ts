import { NextResponse } from "next/server";
import { auth } from "@/auth/auth";
import { conversationService } from "@/services/conversation.service";
import type { ApiError } from "@/types/domain";

/**
 * Workflow Integration phase: a single conversation's full thread —
 * participant-only (ConversationService.getById returns null for
 * anyone who isn't a party to it, same "don't reveal it exists"
 * posture used across this codebase). Opening it also marks this
 * viewer's side as read (see the service method's doc comment).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to view this conversation." };
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const conversation = await conversationService.getById(id, session.user.id);
    if (!conversation) {
      const error: ApiError = { code: "NOT_FOUND", message: "Conversation not found." };
      return NextResponse.json({ error }, { status: 404 });
    }
    return NextResponse.json({ data: conversation }, { status: 200 });
  } catch (err) {
    console.error("GET /api/conversations/[id]", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not load the conversation." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
