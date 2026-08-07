import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { OfferStatusBadge } from "./OfferStatusBadge";
import { OfferAcceptRejectButtons } from "./OfferAcceptRejectButtons";
import type { Offer } from "@/types/domain";

/**
 * Offers module (Stage 1): shown to a request's owner on its detail
 * page — every offer submitted so far, with Accept/Reject for
 * whichever one is still PENDING (see OfferAcceptRejectButtons). Once
 * one offer is accepted the request itself moves to IN_PROGRESS
 * (enforced server-side in OfferService.accept), so this list is
 * read-only after that point — the buttons simply stop rendering for
 * non-PENDING offers.
 *
 * A plain server component now (no "use client", no local handlers) —
 * the only interactive piece is OfferAcceptRejectButtons, which owns
 * its own state. Each offer's supplier name/message links through to
 * /offers/[id] (Offer Details page) for the full view.
 */
export function OffersList({ offers }: { offers: Offer[] }) {
  if (offers.length === 0) {
    return (
      <Card className="mt-4 text-center text-sm text-text-500">
        لا توجد عروض على هذا الطلب حتى الآن.
      </Card>
    );
  }

  return (
    <div dir="rtl" className="mt-4 space-y-3">
      <h2 className="font-display text-base font-extrabold text-navy-950">
        العروض ({offers.length})
      </h2>
      {offers.map((offer) => (
        <Card key={offer.id}>
          <Link href={`/offers/${offer.id}`} className="flex items-start gap-3">
            {offer.supplier.avatarUrl ? (
              <Image
                src={offer.supplier.avatarUrl}
                alt={offer.supplier.displayName}
                width={40}
                height={40}
                className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy-950 text-sm font-bold text-white">
                {offer.supplier.displayName.trim().charAt(0).toUpperCase() || "؟"}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-navy-950 hover:text-teal-700">
                  {offer.supplier.displayName}
                </p>
                <OfferStatusBadge status={offer.status} />
              </div>
              {offer.price != null && (
                <p className="mt-0.5 text-sm font-extrabold text-teal-700">{offer.price}</p>
              )}
              <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-sm text-text-700">{offer.message}</p>
              <p className="mt-1.5 text-xs text-text-400">
                {new Date(offer.createdAt).toLocaleDateString("ar-SA")}
              </p>
            </div>
          </Link>

          {offer.status === "PENDING" && (
            <OfferAcceptRejectButtons offer={offer} />
          )}
        </Card>
      ))}
    </div>
  );
}
