import { Badge } from "@/components/ui/Badge";
import type { OfferStatus } from "@/types/domain";

/** Same label/tone convention as RequestStatusBadge.tsx — kept as its
 * own small component (rather than inlined) since both the buyer's
 * offers list and the supplier's "My Offers" page need it. */
export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  PENDING: "قيد الانتظار",
  ACCEPTED: "مقبول",
  REJECTED: "مرفوض",
  WITHDRAWN: "تم السحب",
  EXPIRED: "منتهي",
};

const STATUS_TONE: Record<OfferStatus, "success" | "warning" | "danger" | "neutral" | "info"> = {
  PENDING: "warning",
  ACCEPTED: "success",
  REJECTED: "danger",
  WITHDRAWN: "neutral",
  EXPIRED: "neutral",
};

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{OFFER_STATUS_LABEL[status]}</Badge>;
}
