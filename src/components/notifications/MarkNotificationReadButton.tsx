"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/ToastProvider";

/**
 * Notifications module: small inline "تحديد كمقروء" action on an
 * unread notification row. Same apiFetch+toast+router.refresh()
 * pattern as every other mutation button in the app (e.g.
 * MyOfferWithdrawButton) — no local state patching, the server
 * component re-fetches the authoritative list on refresh.
 */
export function MarkNotificationReadButton({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isBusy, setIsBusy] = useState(false);

  async function handleMarkRead() {
    setIsBusy(true);
    try {
      await apiFetch(`/api/notifications/${notificationId}/read`, { method: "POST" });
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.error.message : "تعذر تحديث الإشعار.";
      showToast(message, "error");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleMarkRead}
      disabled={isBusy}
      className="whitespace-nowrap text-xs font-semibold text-teal-700 hover:underline disabled:opacity-50"
    >
      تحديد كمقروء
    </button>
  );
}
