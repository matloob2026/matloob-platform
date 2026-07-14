import { NextResponse } from "next/server";
import { z } from "zod";
import { authService, AuthError } from "@/services/auth.service";
import { MIN_PASSWORD_LENGTH } from "@/auth/password";
import type { ApiError } from "@/types/domain";

const RegisterSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(MIN_PASSWORD_LENGTH),
  displayName: z.string().trim().min(2).max(80),
  role: z.enum(["BUYER", "SUPPLIER", "BOTH"]).optional(),
});

export async function POST(request: Request) {
  console.log("[REGISTER ROUTE ENTERED]");

  const body = await request.json().catch(() => null);
  const parsed = RegisterSchema.safeParse(body);

  if (!parsed.success) {
    const error: ApiError = {
      code: "VALIDATION_ERROR",
      message: "Please check the submitted fields and try again.",
      details: parsed.error.flatten().fieldErrors,
    };
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    console.log("[CALLING AUTH SERVICE]");
    const user = await authService.register(parsed.data);
    console.log("[REGISTER COMPLETED]");
    return NextResponse.json(
      { data: { id: user.id, email: user.email, role: user.role, status: user.status } },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AuthError) {
      const status = err.code === "EMAIL_IN_USE" ? 409 : 400;
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status });
    }
    console.error("POST /api/auth/register", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Registration failed. Please try again." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
