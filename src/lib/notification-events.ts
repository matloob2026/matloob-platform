/**
 * UX pass: a tiny client-side event so the unread-notifications badge
 * (rendered inside UserMenu, mounted once per page via SiteHeader) can
 * decrement the instant a notification is marked read somewhere else
 * on the page (the /notifications list, or anywhere else that later
 * marks one read) — without a full page reload and without adding a
 * global state library/context provider for a single counter.
 *
 * `window.CustomEvent` only exists in the browser, so every function
 * here is a no-op during SSR (`typeof window === "undefined"`).
 */

export const NOTIFICATION_READ_EVENT = "matloob:notification-read";

export interface NotificationReadEventDetail {
  count: number;
}

export function emitNotificationRead(count = 1): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<NotificationReadEventDetail>(NOTIFICATION_READ_EVENT, { detail: { count } })
  );
}
