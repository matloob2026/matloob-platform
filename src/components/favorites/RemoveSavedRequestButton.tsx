"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/ToastProvider";

/**
 * Saved Requests module: unfavorite from the /saved-requests list.
 * Reuses the exact same POST /api/favorites toggle endpoint the
 * homepage's heart-icon button already calls (see
 * public/marketing/homepage-scripts.js's toggleFavorite) — every item
 * on this page is, by definition, currently favorited, so toggling it
 * always removes it here.
 */
export function RemoveSavedRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isBusy, setIsBusy] = useState(false);

  async function handleRemove() {
    setIsBusy(true);
    try {
      await apiFetch("/api/favorites", {
        method: "POST",
        body: JSON.stringify({ requestId }),
      });
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.error.message : "تعذر إزالة الطلب من المحفوظات.";
      showToast(message, "error");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={isBusy}
      className="whitespace-nowrap text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
    >
      إزالة من المحفوظات
    </button>
  );
}
