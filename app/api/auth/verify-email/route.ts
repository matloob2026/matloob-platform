import { NextResponse } from "next/server";
import { z } from "zod";
import { authService, AuthError } from "@/services/auth.service";
import type { ApiError } from "@/types/domain";

const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = VerifyEmailSchema.safeParse(body);

  if (!parsed.success) {
    const error: ApiError = { code: "VALIDATION_ERROR", message: "Missing verification token." };
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    await authService.verifyEmail(parsed.data.token);
    return NextResponse.json({ data: { verified: true } }, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: 400 });
    }
    console.error("POST /api/auth/verify-email", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Verification failed. Please try again." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
