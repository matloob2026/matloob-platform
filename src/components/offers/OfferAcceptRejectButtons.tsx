"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import type { Offer } from "@/types/domain";

/**
 * Offers module: the request-owner's Accept/Reject actions on a
 * single PENDING offer — factored out of OffersList.tsx (which
 * originally had this logic inline, one copy per row) so the new
 * Offer Details page (/offers/[id]) can render the exact same
 * accept/reject behavior for a single offer without duplicating the
 * confirm+toast+refresh handlers. Same pattern as
 * MyOfferWithdrawButton (the supplier-side equivalent action).
 */
export function OfferAcceptRejectButtons({ offer }: { offer: Offer }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [isBusy, setIsBusy] = useState(false);

  async function handleAccept() {
    const confirmed = await confirm({
      title: "قبول العرض",
      message: `هل تريد قبول عرض ${offer.supplier.displayName}؟ سيتم إغلاق الطلب أمام العروض الأخرى وفتح محادثة مع المورد.`,
      confirmLabel: "قبول العرض",
    });
    if (!confirmed) return;

    setIsBusy(true);
    try {
      const res = await apiFetch<{ data: { conversationId: string } }>(`/api/offers/${offer.id}/accept`, {
        method: "POST",
      });
      showToast("تم قبول العرض. جارٍ نقلك إلى المحادثة...", "success");
      // Workflow Integration phase (item 2): redirect the buyer straight
      // into the conversation that was just opened, instead of just
      // refreshing this page — router.push (not refresh) since we're
      // navigating away entirely.
      router.push(`/conversations/${res.data.conversationId}`);
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.error.message : "تعذر قبول العرض.";
      showToast(message, "error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleReject() {
    const confirmed = await confirm({
      title: "رفض العرض",
      message: `هل تريد رفض عرض ${offer.supplier.displayName}؟`,
      confirmLabel: "رفض",
      danger: true,
    });
    if (!confirmed) return;

    setIsBusy(true);
    try {
      await apiFetch(`/api/offers/${offer.id}/reject`, { method: "POST" });
      showToast("تم رفض العرض", "success");
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.error.message : "تعذر رفض العرض.";
      showToast(message, "error");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="flex gap-2 border-t border-border pt-3">
      <Button size="sm" onClick={handleAccept} disabled={isBusy}>
        قبول
      </Button>
      <Button variant="outline" size="sm" onClick={handleReject} disabled={isBusy}>
        رفض
      </Button>
    </div>
  );
}
