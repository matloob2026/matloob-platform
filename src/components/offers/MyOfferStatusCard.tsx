import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { OfferStatusBadge } from "./OfferStatusBadge";
import { MyOfferWithdrawButton } from "./MyOfferWithdrawButton";
import type { Offer } from "@/types/domain";

/**
 * Offers module (Stage 1): shown instead of <SendOfferForm> on a
 * request's detail page once the signed-in viewer has already
 * submitted an offer on it — a supplier can only ever have one offer
 * per request (schema's `@@unique([requestId, supplierId])`), so this
 * replaces the form rather than sitting alongside it.
 *
 * A plain server component now — withdraw is delegated entirely to
 * <MyOfferWithdrawButton>, the same standalone action component the
 * /my-offers list and the Offer Details page also use, instead of
 * this file keeping its own duplicate confirm+toast+refresh handler.
 */
export function MyOfferStatusCard({ offer }: { offer: Offer }) {
  return (
    <Card className="mt-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-base font-extrabold text-navy-950">عرضك على هذا الطلب</h2>
        <OfferStatusBadge status={offer.status} />
      </div>
      {offer.price != null && <p className="mt-2 text-sm font-extrabold text-teal-700">{offer.price}</p>}
      <p className="mt-1.5 whitespace-pre-line text-sm text-text-700">{offer.message}</p>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <Link href={`/offers/${offer.id}`} className="text-xs font-semibold text-teal-700 hover:underline">
          عرض التفاصيل
        </Link>
        {offer.status === "PENDING" && <MyOfferWithdrawButton offerId={offer.id} />}
      </div>
    </Card>
  );
}
