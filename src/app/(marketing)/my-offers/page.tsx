import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth/auth";
import { offerService } from "@/services/offer.service";
import { Card } from "@/components/ui/Card";
import { OfferStatusBadge } from "@/components/offers/OfferStatusBadge";
import { EditableOfferBody } from "@/components/offers/EditableOfferBody";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "عروضي | مطلوب",
};

/**
 * Offers module: the supplier-facing dashboard counterpart to
 * /my-requests — every offer the signed-in user has ever submitted,
 * across every request, newest first (`offerService.listMine` already
 * orders by `createdAt: "desc"`).
 *
 * Offers Integration phase redesign: each row now also shows the
 * request's thumbnail and city (via `OfferWithRequest.request`, which
 * now carries them — see src/types/domain.ts), and price/message +
 * Edit/Withdraw are delegated to <EditableOfferBody canEdit>, the
 * same component MyOfferStatusCard and the Offer Details page use.
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
                <div className="flex items-start gap-3">
                  {offer.request.coverImageUrl ? (
                    <Image
                      src={offer.request.coverImageUrl}
                      alt={offer.request.title}
                      width={64}
                      height={64}
                      className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-surface-muted text-xs text-text-400">
                      لا صورة
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/requests/${offer.request.id}`}
                        className="font-display text-base font-extrabold text-navy-950 hover:text-teal-700"
                      >
                        {offer.request.title}
                      </Link>
                      <OfferStatusBadge status={offer.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-text-400">
                      {offer.request.city ? offer.request.city.name.current : "بدون مدينة"} ·{" "}
                      قُدِّم بتاريخ {new Date(offer.createdAt).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                </div>

                <EditableOfferBody offer={offer} canEdit />

                <div className="mt-3 border-t border-border pt-3">
                  <Link href={`/offers/${offer.id}`} className="text-xs font-semibold text-teal-700 hover:underline">
                    عرض التفاصيل
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
