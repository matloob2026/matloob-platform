import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth/auth";
import { notificationService } from "@/services/notification.service";
import { Card } from "@/components/ui/Card";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MarkNotificationReadButton } from "@/components/notifications/MarkNotificationReadButton";

export const metadata: Metadata = {
  title: "الإشعارات | مطلوب",
};

/**
 * Notifications module: the user-facing inbox for every notification
 * `notificationService.notify()` has ever created for this user
 * (NEW_OFFER, OFFER_ACCEPTED, OFFER_REJECTED, etc.) — the backend
 * already dispatches these from OfferService; this page is simply the
 * first place a signed-in user can actually read them. Same page
 * shape as /my-requests and /my-offers on purpose.
 */
export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/notifications");
  }

  const items = await notificationService.listForUser(session.user.id);
  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <SiteHeader title="الإشعارات" />
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-extrabold text-navy-950 sm:text-3xl">الإشعارات</h1>
          <p className="mt-1 text-sm text-text-500">
            {unreadCount > 0 ? `لديك ${unreadCount} إشعار غير مقروء` : "لا توجد إشعارات غير مقروءة"}
          </p>
        </div>

        {items.length === 0 ? (
          <Card className="text-center text-sm text-text-500">لا توجد إشعارات بعد.</Card>
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <Card key={n.id} className={n.isRead ? "opacity-70" : undefined}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {n.linkUrl ? (
                      <Link href={n.linkUrl} className="font-bold text-navy-950 hover:text-teal-700">
                        {n.title}
                      </Link>
                    ) : (
                      <p className="font-bold text-navy-950">{n.title}</p>
                    )}
                    <p className="mt-1 text-sm text-text-700">{n.body}</p>
                    <p className="mt-1.5 text-xs text-text-400">
                      {new Date(n.createdAt).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                  {!n.isRead && <MarkNotificationReadButton notificationId={n.id} />}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
