import { NextResponse } from "next/server";
import { z } from "zod";
import { authService, AuthError } from "@/services/auth.service";
import { MIN_PASSWORD_LENGTH } from "@/auth/password";
import type { ApiError } from "@/types/domain";

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(MIN_PASSWORD_LENGTH),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = ResetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    const error: ApiError = {
      code: "VALIDATION_ERROR",
      message: "Please check the submitted fields and try again.",
    };
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    await authService.resetPassword(parsed.data.token, parsed.data.password);
    return NextResponse.json({ data: { reset: true } }, { status: 200 });
  } catch (err) {
    if (err instanceof AuthError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: 400 });
    }
    console.error("POST /api/auth/reset-password", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Reset failed. Please try again." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
