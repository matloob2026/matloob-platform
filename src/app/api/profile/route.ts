import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth/auth";
import {
  profileService,
  ProfileServiceError,
  profileServiceErrorStatus,
  PREFERRED_CONTACT_METHODS,
} from "@/services/profile.service";
import type { ApiError } from "@/types/domain";

const UpdateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  contactPhone: z.string().trim().max(30).nullable().optional(),
  cityId: z.string().nullable().optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  preferredContactMethod: z.enum(PREFERRED_CONTACT_METHODS).nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to view your profile." };
    return NextResponse.json({ error }, { status: 401 });
  }

  const profile = await profileService.getProfile(session.user.id);
  if (!profile) {
    const error: ApiError = { code: "NOT_FOUND", message: "Profile not found." };
    return NextResponse.json({ error }, { status: 404 });
  }

  return NextResponse.json({ data: profile }, { status: 200 });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to update your profile." };
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    const error: ApiError = {
      code: "VALIDATION_ERROR",
      message: "Please check the submitted fields and try again.",
      details: parsed.error.flatten().fieldErrors,
    };
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const updated = await profileService.updateProfile(session.user.id, parsed.data);
    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    if (err instanceof ProfileServiceError) {
      const error: ApiError = { code: err.code, message: err.message };
      return NextResponse.json({ error }, { status: profileServiceErrorStatus(err.code) });
    }
    console.error("PATCH /api/profile", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not update your profile." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
