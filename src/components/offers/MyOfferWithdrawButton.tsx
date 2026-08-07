"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { apiFetch, ApiRequestError } from "@/lib/api-client";

/**
 * Offers module (Stage 1): standalone withdraw action for the /my-offers
 * list, factored out of <MyOfferStatusCard>'s inline handler so both the
 * request-detail page (single offer) and the My Offers dashboard (list of
 * offers) share the exact same confirm+toast+refresh behavior.
 */
export function MyOfferWithdrawButton({ offerId }: { offerId: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [isBusy, setIsBusy] = useState(false);

  async function handleWithdraw() {
    const confirmed = await confirm({
      title: "سحب العرض",
      message: "هل تريد سحب عرضك على هذا الطلب؟",
      confirmLabel: "سحب العرض",
      danger: true,
    });
    if (!confirmed) return;

    setIsBusy(true);
    try {
      await apiFetch(`/api/offers/${offerId}/withdraw`, { method: "POST" });
      showToast("تم سحب عرضك", "success");
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.error.message : "تعذر سحب العرض.";
      showToast(message, "error");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Button variant="danger" size="sm" onClick={handleWithdraw} disabled={isBusy}>
      سحب العرض
    </Button>
  );
}
