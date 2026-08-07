/**
 * Item 6 (future-ready buyer privacy): single point of truth for
 * "can the current viewer see this request's buyer contact info?"
 * (the phone/WhatsApp/email block on a request's detail page, shown
 * today to any viewer once the buyer opts each field visible).
 *
 * Always returns true today — the whole marketplace is open during
 * this marketing phase, unconditionally, exactly as before. The
 * intended future rule (NOT activated — do not uncomment without an
 * explicit go-ahead, since it depends on a provider-subscription
 * concept that doesn't exist in the schema yet):
 *
 *   if (viewerId && viewerId !== request.owner.id) {
 *     // viewer is a prospective service provider, not the buyer
 *     return viewerSubscriptionStatus === "ACTIVE";
 *   }
 *   return true; // the buyer always sees their own contact info
 *
 * Every call site calls this function rather than re-deriving the
 * rule inline, so activating the restriction later is a one-file
 * change, not a hunt across every page that renders buyer contact
 * info.
 */

import type { RequestDetail } from "@/types/domain";

export function isBuyerContactVisible(_request: RequestDetail, _viewerId: string | undefined): boolean {
  return true;
}
