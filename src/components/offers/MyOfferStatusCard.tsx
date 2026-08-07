import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { OfferStatusBadge } from "./OfferStatusBadge";
import { EditableOfferBody } from "./EditableOfferBody";
import type { Offer } from "@/types/domain";

/**
 * Offers module (Stage 1): shown instead of <SendOfferForm> on a
 * request's detail page once the signed-in viewer has already
 * submitted an offer on it — a supplier can only ever have one offer
 * per request (schema's `@@unique([requestId, supplierId])`), so this
 * replaces the form rather than sitting alongside it.
 *
 * Offers Integration phase: price/message + Edit/Withdraw are now
 * delegated entirely to <EditableOfferBody canEdit>, the same
 * component the redesigned /my-offers list and the Offer Details page
 * use, instead of this file keeping its own duplicate display/handler.
 */
export function MyOfferStatusCard({ offer }: { offer: Offer }) {
  return (
    <Card className="mt-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-base font-extrabold text-navy-950">عرضك على هذا الطلب</h2>
        <OfferStatusBadge status={offer.status} />
      </div>
      <EditableOfferBody offer={offer} canEdit />
      <div className="mt-3 border-t border-border pt-3">
        <Link href={`/offers/${offer.id}`} className="text-xs font-semibold text-teal-700 hover:underline">
          عرض التفاصيل
        </Link>
      </div>
    </Card>
  );
}
