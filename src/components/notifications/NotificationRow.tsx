"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/ToastProvider";
import { emitNotificationRead } from "@/lib/notification-events";
import type { NotificationItem } from "@/types/domain";

/**
 * Notifications UX pass: the entire notification card is now the
 * click target — "opening" a notification (clicking anywhere on it)
 * marks it read immediately and, if it has a `linkUrl`, navigates
 * there. Replaces the old separate "تحديد كمقروء" button
 * (MarkNotificationReadButton is left in place, unused, rather than
 * deleted — no other caller of it existed to break).
 *
 * Marks read optimistically (local state flips + the header badge's
 * count event fires synchronously on click) before the API call
 * resolves, same "instant, then confirm/revert in the background"
 * pattern the homepage's favorite-heart toggle already uses — the
 * requirement is the badge decreasing the instant you open one, not
 * after a network round trip.
 */
export function NotificationRow({ notification }: { notification: NotificationItem }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isRead, setIsRead] = useState(notification.isRead);

  function handleOpen() {
    if (!isRead) {
      setIsRead(true);
      emitNotificationRead();
      apiFetch(`/api/notifications/${notification.id}/read`, { method: "POST" }).catch((err) => {
        const message = err instanceof ApiRequestError ? err.error.message : "تعذر تحديث الإشعار.";
        showToast(message, "error");
      });
    }
    if (notification.linkUrl) {
      router.push(notification.linkUrl);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleOpen();
    }
  }

  return (
    <Card
      className={`cursor-pointer transition ${isRead ? "opacity-70" : "hover:shadow-card-lg"}`}
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-navy-950">{notification.title}</p>
          <p className="mt-1 text-sm text-text-700">{notification.body}</p>
          <p className="mt-1.5 text-xs text-text-400">
            {new Date(notification.createdAt).toLocaleDateString("ar-SA")}
          </p>
        </div>
        {!isRead && (
          <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-teal-600" aria-label="غير مقروء" />
        )}
      </div>
    </Card>
  );
}
