import { NextResponse } from "next/server";
import { z } from "zod";
import { authService } from "@/services/auth.service";
import type { ApiError } from "@/types/domain";

const ResendVerificationSchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = ResendVerificationSchema.safeParse(body);

  if (!parsed.success) {
    const error: ApiError = { code: "VALIDATION_ERROR", message: "Please enter a valid email address." };
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    // Always resolves — silently no-ops for unknown emails or accounts
    // that are already verified, same anti-enumeration posture as
    // /api/auth/forgot-password.
    await authService.resendVerificationEmail(parsed.data.email);
  } catch (err) {
    console.error("POST /api/auth/resend-verification", err);
  }

  return NextResponse.json(
    { data: { message: "If an unverified account exists for this email, a new verification link has been sent." } },
    { status: 200 }
  );
}
