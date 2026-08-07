import { NextResponse } from "next/server";
import { auth } from "@/auth/auth";
import { notificationService } from "@/services/notification.service";
import type { ApiError } from "@/types/domain";

/**
 * Notifications module: list the signed-in user's own notifications,
 * newest first. `notificationService` (create/list/markRead) was
 * already fully implemented — this is the first route exposing it to
 * a user-facing page (the admin NotificationBell is a separate,
 * admin-only surface and doesn't call this).
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to view notifications." };
    return NextResponse.json({ error }, { status: 401 });
  }

  const unreadOnly = new URL(request.url).searchParams.get("unreadOnly") === "true";

  try {
    const items = await notificationService.listForUser(session.user.id, unreadOnly);
    return NextResponse.json({ data: items }, { status: 200 });
  } catch (err) {
    console.error("GET /api/notifications", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not load notifications." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
