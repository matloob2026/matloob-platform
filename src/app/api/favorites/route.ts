import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth/auth";
import { favoriteService } from "@/services/favorite.service";
import type { ApiError } from "@/types/domain";

/**
 * Toggle a request's favorite status for the signed-in user — reuses
 * the existing `Favorite` model (see src/services/favorite.service.ts).
 * The homepage heart icon calls this directly (see
 * public/marketing/homepage-scripts.js's `toggleFavorite`).
 */

const ToggleFavoriteSchema = z.object({
  requestId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    const error: ApiError = { code: "UNAUTHENTICATED", message: "You must be signed in to favorite a request." };
    return NextResponse.json({ error }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = ToggleFavoriteSchema.safeParse(body);
  if (!parsed.success) {
    const error: ApiError = { code: "VALIDATION_ERROR", message: "A valid requestId is required." };
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const result = await favoriteService.toggle(session.user.id, parsed.data.requestId);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (err) {
    console.error("POST /api/favorites", err);
    const error: ApiError = { code: "UNKNOWN_ERROR", message: "Could not update favorites. Please try again." };
    return NextResponse.json({ error }, { status: 500 });
  }
}
