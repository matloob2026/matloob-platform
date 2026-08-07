import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth/auth";
import { notificationService } from "@/services/notification.service";
import type { ApiError } from "@/types/domain";

/**
 * Notifications module: mark one of the signed-in user's own
 * notifications as read. `markRead` is already scoped to
 * `{ id, userId }` in the service (an `updateMany` with both fields
 * in the where-clause), so a user can never mark someone else's
 * notification read even if they guess an id.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to update notifications." };
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    await notificationService.markRead(id, session.user.id);
    revalidatePath("/notifications");
    return NextResponse.json({ data: { id } }, { status: 200 });
  } catch (err) {
    console.error("POST /api/notifications/[id]/read", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not update the notification." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
