import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth/auth";
import { offerService } from "@/services/offer.service";
import { requestService } from "@/services/request.service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { OfferStatusBadge } from "@/components/offers/OfferStatusBadge";
import { OfferAcceptRejectButtons } from "@/components/offers/OfferAcceptRejectButtons";
import { EditableOfferBody } from "@/components/offers/EditableOfferBody";
import { SiteHeader } from "@/components/layout/SiteHeader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const offer = await offerService.getById(id);
  return { title: offer ? `عرض على ${offer.request.title} | مطلوب` : "العرض غير موجود | مطلوب" };
}

/**
 * Offers module (Stage 1): the Offer Details page — the single-offer
 * counterpart to the request-detail page's inline OffersList/
 * MyOfferStatusCard views. Reachable from both: a buyer clicks an
 * offer card in OffersList, a supplier clicks a row in /my-offers.
 *
 * Authorization: only the two parties to this offer may view it — the
 * request's owner (buyer) or the offer's own supplier. Neither
 * `offerService.getById` nor the Offer/Request models carry that
 * check themselves (getById is a plain data fetch, same reasoning
 * documented on its declaration in offer.service.ts), so it's done
 * here by cross-referencing `requestService.getById`'s `owner.id` —
 * the same two-service-call pattern the request-detail page already
 * uses for its own isOwner check. An unauthorized viewer gets
 * notFound(), not a 403, so this never confirms/denies an offer's
 * existence to someone who isn't a party to it.
 */
export default async function OfferDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/offers/${id}`);
  }

  const offer = await offerService.getById(id);
  if (!offer) notFound();

  const request = await requestService.getById(offer.requestId);
  if (!request) notFound();

  const isBuyer = request.owner.id === session.user.id;
  const isSupplier = offer.supplier.id === session.user.id;
  if (!isBuyer && !isSupplier) notFound();

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <SiteHeader title="تفاصيل العرض" />
      <div className="mx-auto max-w-2xl space-y-4">
        <Card>
          <p className="text-xs text-text-400">مقدَّم على الطلب</p>
          <Link
            href={`/requests/${request.id}`}
            className="font-display text-lg font-extrabold text-navy-950 hover:text-teal-700"
          >
            {request.title}
          </Link>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {offer.supplier.avatarUrl ? (
                <Image
                  src={offer.supplier.avatarUrl}
                  alt={offer.supplier.displayName}
                  width={48}
                  height={48}
                  className="h-12 w-12 flex-shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-navy-950 text-base font-bold text-white">
                  {offer.supplier.displayName.trim().charAt(0).toUpperCase() || "؟"}
                </span>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display text-base font-extrabold text-navy-950">
                    {offer.supplier.displayName}
                  </p>
                  {offer.supplier.isVerifiedSupplier && <Badge tone="info">موثّق</Badge>}
                </div>
                {offer.supplier.ratingCount > 0 && (
                  <p className="mt-0.5 text-xs text-text-400">
                    {offer.supplier.ratingAvg.toFixed(1)} ★ ({offer.supplier.ratingCount} تقييم)
                  </p>
                )}
              </div>
            </div>
            <OfferStatusBadge status={offer.status} />
          </div>

          <EditableOfferBody offer={offer} canEdit={isSupplier} />
          <p className="mt-3 text-xs text-text-400">
            قُدِّم بتاريخ {new Date(offer.createdAt).toLocaleDateString("ar-SA")}
          </p>

          {offer.status === "PENDING" && isBuyer && (
            <div className="mt-4 border-t border-border pt-4">
              <OfferAcceptRejectButtons offer={offer} />
            </div>
          )}
          {offer.status === "ACCEPTED" && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
              تم قبول هذا العرض. يمكنكما الآن التواصل مباشرة بخصوص الطلب.
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
