import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth/auth";
import {
  conversationService,
  ConversationServiceError,
  conversationServiceErrorStatus,
} from "@/services/conversation.service";
import type { ApiError } from "@/types/domain";

/**
 * Workflow Integration phase (item 3): send a message in a
 * conversation — participant-only, persisted in the database, no mock
 * data. Notifies the other participant(s) (NEW_MESSAGE) inside the
 * same transaction the message is written in (see
 * ConversationService.sendMessage).
 */

const SendMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to send a message." };
    return NextResponse.json({ error }, { status: 401 });
  }

  const requestBody = await request.json().catch(() => null);
  const parsed = SendMessageSchema.safeParse(requestBody);
  if (!parsed.success) {
    const error: ApiError = { code: "VALIDATION_ERROR", message: "Please write a message before sending." };
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const message = await conversationService.sendMessage(id, session.user.id, parsed.data.body);
    revalidatePath(`/conversations/${id}`);
    revalidatePath("/conversations");
    return NextResponse.json({ data: message }, { status: 201 });
  } catch (err) {
    if (err instanceof ConversationServiceError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: conversationServiceErrorStatus(err.code) });
    }
    console.error("POST /api/conversations/[id]/messages", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not send the message." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
