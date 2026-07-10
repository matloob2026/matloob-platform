import { NextResponse } from "next/server";
import { z } from "zod";
import { authService } from "@/services/auth.service";
import type { ApiError } from "@/types/domain";

const ForgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = ForgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    const error: ApiError = { code: "VALIDATION_ERROR", message: "Please enter a valid email address." };
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    // Always resolves — AuthService.requestPasswordReset silently
    // no-ops for unknown emails. The response is identical either way
    // so this endpoint can never be used to test which emails exist.
    await authService.requestPasswordReset(parsed.data.email);
  } catch (err) {
    // Even on an unexpected internal error, don't leak that to the
    // client via a different response shape — log and still return the
    // generic success response.
    console.error("POST /api/auth/forgot-password", err);
  }

  return NextResponse.json(
    { data: { message: "If an account exists for this email, a reset link has been sent." } },
    { status: 200 }
  );
}
