import { Phone, MessageCircle, Mail } from "lucide-react";
import type { OfferContactInfo } from "@/types/domain";

/**
 * UX pass (items 4 + 5): the service provider's contact info shown
 * directly on an offer card — phone/WhatsApp/email, each a real
 * clickable link (tel:/wa.me/mailto:), shown on both pending and
 * accepted offers per the requirement. Renders nothing if the offer
 * has no contact info at all (a provider who never filled in a
 * contact phone on their profile).
 *
 * Visibility gate: always shown today, no restriction — item 4/5
 * didn't ask for one (contrast with item 6's buyer-side gate, see
 * src/lib/buyer-contact-visibility.ts, which is a separate, opposite-
 * direction concern: providers seeing the buyer's contact info).
 */
export function OfferContactLinks({ contact }: { contact: OfferContactInfo }) {
  if (!contact.phone && !contact.whatsapp && !contact.email) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-xs">
      <span className="font-bold text-navy-950">معلومات التواصل:</span>
      {contact.phone && (
        <a
          href={`tel:${contact.phone}`}
          className="flex items-center gap-1 font-semibold text-teal-700 hover:underline"
          dir="ltr"
        >
          <Phone size={14} strokeWidth={2} />
          {contact.phone}
        </a>
      )}
      {contact.whatsapp && (
        <a
          href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
        >
          <MessageCircle size={14} strokeWidth={2} />
          واتساب
        </a>
      )}
      {contact.email && (
        <a
          href={`mailto:${contact.email}`}
          className="flex items-center gap-1 font-semibold text-teal-700 hover:underline"
          dir="ltr"
        >
          <Mail size={14} strokeWidth={2} />
          {contact.email}
        </a>
      )}
    </div>
  );
}
