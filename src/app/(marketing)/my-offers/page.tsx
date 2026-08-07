import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth/auth";
import { offerService } from "@/services/offer.service";
import { Card } from "@/components/ui/Card";
import { OfferStatusBadge } from "@/components/offers/OfferStatusBadge";
import { MyOfferWithdrawButton } from "@/components/offers/MyOfferWithdrawButton";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "عروضي | مطلوب",
};

/**
 * Offers module (Stage 1): the supplier-facing dashboard counterpart
 * to /my-requests — every offer the signed-in user has ever
 * submitted, across every request, newest first. Same page shape
 * (Suspense-free server component, redirect-if-signed-out, a Card per
 * item) as src/app/(marketing)/my-requests/page.tsx on purpose.
 */
export default async function MyOffersPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/my-offers");
  }

  const { items, totalItems } = await offerService.listMine(session.user.id, { pageSize: 50 });

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <SiteHeader title="عروضي" />
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-extrabold text-navy-950 sm:text-3xl">عروضي</h1>
          <p className="mt-1 text-sm text-text-500">
            {totalItems > 0 ? `قدّمت ${totalItems} عرض` : "لم تقدّم أي عرض بعد"}
          </p>
        </div>

        {items.length === 0 ? (
          <Card className="text-center text-sm text-text-500">
            لم تقدّم أي عرض حتى الآن. تصفّح{" "}
            <Link href="/requests" className="font-bold text-teal-700 hover:underline">
              الطلبات المتاحة
            </Link>{" "}
            وابدأ بتقديم عروضك.
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((offer) => (
              <Card key={offer.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/requests/${offer.request.id}`}
                      className="font-display text-base font-extrabold text-navy-950 hover:text-teal-700"
                    >
                      {offer.request.title}
                    </Link>
                    {offer.price != null && (
                      <p className="mt-1 text-sm font-extrabold text-teal-700">{offer.price}</p>
                    )}
                    <p className="mt-1.5 whitespace-pre-line text-sm text-text-700">{offer.message}</p>
                    <p className="mt-1.5 text-xs text-text-400">
                      {new Date(offer.createdAt).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                  <OfferStatusBadge status={offer.status} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                  <Link href={`/offers/${offer.id}`} className="text-xs font-semibold text-teal-700 hover:underline">
                    عرض التفاصيل
                  </Link>
                  {offer.status === "PENDING" && <MyOfferWithdrawButton offerId={offer.id} />}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
