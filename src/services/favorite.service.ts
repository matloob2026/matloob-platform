/**
 * FavoriteService
 * ===============
 * Logged-in users can favorite/unfavorite a request from any request
 * card (homepage, listing, detail). Reuses the EXISTING `Favorite`
 * model (userId + requestId, unique pair) — no schema change.
 */

import { prisma } from "@/lib/prisma";

export class FavoriteService {
  /** Toggles the favorite for this user/request pair — removes it if
   * it already exists, creates it otherwise. Returns the resulting
   * state so the caller (the API route) can tell the client exactly
   * what to show without a second round-trip. */
  async toggle(userId: string, requestId: string): Promise<{ favorited: boolean }> {
    const existing = await prisma.favorite.findUnique({
      where: { userId_requestId: { userId, requestId } },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }

    await prisma.favorite.create({ data: { userId, requestId } });
    return { favorited: true };
  }

  /** Batch-checks which of the given request ids this user has
   * already favorited — used to render the correct initial heart
   * state (filled/unfilled) for every card on a page in one query,
   * never one query per card. */
  async listFavoritedRequestIds(userId: string, requestIds: string[]): Promise<Set<string>> {
    if (requestIds.length === 0) return new Set();
    const rows = await prisma.favorite.findMany({
      where: { userId, requestId: { in: requestIds } },
      select: { requestId: true },
    });
    return new Set(rows.map((r: { requestId: string }) => r.requestId));
  }
}

export const favoriteService = new FavoriteService();
