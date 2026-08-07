import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth/auth";
import { authService, AuthError } from "@/services/auth.service";
import { MIN_PASSWORD_LENGTH } from "@/auth/password";
import type { ApiError } from "@/types/domain";

/**
 * Account Settings module: self-service password change while already
 * signed in — reuses `authService.changePassword` (the SAME method the
 * Admin Profile page already calls via a server action), just exposed
 * here as a REST route for the marketing/user side, which follows the
 * fetch+/api/... convention everywhere else (Offers, Favorites,
 * Notifications) rather than server actions.
 *
 * NOTE: this app's user-facing session is JWT-strategy NextAuth (see
 * src/auth/auth.config.ts), not the DB-backed `Session` table the
 * admin side uses — `changePassword`'s `session.deleteMany` still runs
 * (harmless no-op for JWT users) but does not itself invalidate the
 * caller's current browser session. The client is responsible for
 * calling next-auth's `signOut()` after a successful response so the
 * user re-authenticates with the new password, mirroring the admin
 * flow's explicit `destroyAdminSession()` step.
 */

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to change your password." };
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = ChangePasswordSchema.safeParse(body);
  if (!parsed.success) {
    const error: ApiError = {
      code: "VALIDATION_ERROR",
      message: "Please check the submitted fields and try again.",
    };
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    await authService.changePassword(session.user.id, parsed.data.currentPassword, parsed.data.newPassword);
    return NextResponse.json({ data: { changed: true } }, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: 400 });
    }
    console.error("POST /api/account/change-password", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not change password. Please try again." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
