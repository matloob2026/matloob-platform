import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth/auth";
import { requestService } from "@/services/request.service";
import { Card } from "@/components/ui/Card";
import { RequestStatusBadge } from "@/components/requests/RequestStatusBadge";
import { RemoveSavedRequestButton } from "@/components/favorites/RemoveSavedRequestButton";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "المحفوظات | مطلوب",
};

/**
 * Saved Requests module: every request the signed-in user has
 * favorited (see FavoriteService.toggle / requestService.listSaved),
 * most-recently-saved first. Same page shape as /my-requests and
 * /my-offers on purpose.
 */
export default async function SavedRequestsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/saved-requests");
  }

  const { items, totalItems } = await requestService.listSaved(session.user.id, 1, 50);

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <SiteHeader title="المحفوظات" />
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-extrabold text-navy-950 sm:text-3xl">المحفوظات</h1>
          <p className="mt-1 text-sm text-text-500">
            {totalItems > 0 ? `لديك ${totalItems} طلب محفوظ` : "لا توجد طلبات محفوظة بعد"}
          </p>
        </div>

        {items.length === 0 ? (
          <Card className="text-center text-sm text-text-500">
            لم تحفظ أي طلب حتى الآن. اضغط على أيقونة الحفظ في أي طلب لإضافته هنا.
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((r) => (
              <Card key={r.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/requests/${r.id}`}
                      className="font-display text-base font-extrabold text-navy-950 hover:text-teal-700"
                    >
                      {r.title}
                    </Link>
                    <p className="mt-1 text-xs text-text-400">
                      {r.category.name.current}
                      {r.city ? ` · ${r.city.name.current}` : ""} · {r.offerCount} عرض
                    </p>
                  </div>
                  <RequestStatusBadge status={r.status} />
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <RemoveSavedRequestButton requestId={r.id} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
