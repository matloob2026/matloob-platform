"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea, Input } from "@/components/ui/Field";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import type { Offer } from "@/types/domain";

/**
 * Offers Integration phase: the supplier's own view of a single
 * offer's price/message, with inline Edit (PATCH /api/offers/[id])
 * and Withdraw (POST /api/offers/[id]/withdraw) — replaces the
 * read-only price/message block + separate withdraw-only button that
 * MyOfferStatusCard/my-offers/Offer-Details previously each rendered
 * on their own. `canEdit` is false for a viewer who isn't this offer's
 * supplier (e.g. the buyer on the Offer Details page), in which case
 * this renders as plain read-only text — same content, no actions.
 */
export function EditableOfferBody({ offer, canEdit = false }: { offer: Offer; canEdit?: boolean }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState(offer.message);
  const [price, setPrice] = useState(offer.price != null ? String(offer.price) : "");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAct = canEdit && offer.status === "PENDING";

  function startEdit() {
    setMessage(offer.message);
    setPrice(offer.price != null ? String(offer.price) : "");
    setError(null);
    setIsEditing(true);
  }

  async function handleSave() {
    if (!message.trim()) {
      setError("الرجاء كتابة رسالة مع العرض.");
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/offers/${offer.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          message: message.trim(),
          price: price ? Number(price) : null,
        }),
      });
      showToast("تم تحديث عرضك", "success");
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.error.message : "تعذر تحديث العرض.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setIsBusy(false);
    }
  }

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
      await apiFetch(`/api/offers/${offer.id}/withdraw`, { method: "POST" });
      showToast("تم سحب عرضك", "success");
      router.refresh();
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.error.message : "تعذر سحب العرض.";
      showToast(msg, "error");
    } finally {
      setIsBusy(false);
    }
  }

  if (isEditing) {
    return (
      <div className="mt-2 space-y-3">
        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={2000}
          disabled={isBusy}
        />
        <Input
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="السعر المقترح (اختياري)"
          disabled={isBusy}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={isBusy}>
            {isBusy ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isBusy}>
            إلغاء
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {offer.price != null && <p className="mt-2 text-sm font-extrabold text-teal-700">{offer.price}</p>}
      <p className="mt-1.5 whitespace-pre-line text-sm text-text-700">{offer.message}</p>
      {canAct && (
        <div className="mt-3 flex gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={startEdit} disabled={isBusy}>
            تعديل
          </Button>
          <Button variant="danger" size="sm" onClick={handleWithdraw} disabled={isBusy}>
            سحب العرض
          </Button>
        </div>
      )}
    </div>
  );
}
