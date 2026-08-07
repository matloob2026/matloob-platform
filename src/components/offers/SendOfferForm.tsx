"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea, Input, FormField } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/ToastProvider";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import type { Offer } from "@/types/domain";

/**
 * Offers module (Stage 1): the supplier-side "send an offer" form,
 * shown on a request's detail page to any signed-in non-owner viewer
 * who hasn't already offered on this request (see the visibility
 * logic in requests/[id]/page.tsx). Mirrors RequestOwnerActions.tsx's
 * conventions: apiFetch + ApiRequestError, useToast, router.refresh()
 * after a successful mutation instead of manually patching local
 * state.
 */
export function SendOfferForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 5) {
      setError("الرجاء كتابة رسالة لا تقل عن 5 أحرف.");
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      await apiFetch<{ data: Offer }>("/api/offers", {
        method: "POST",
        body: JSON.stringify({
          requestId,
          message: message.trim(),
          price: price ? Number(price) : undefined,
        }),
      });
      showToast("تم إرسال عرضك بنجاح", "success");
      setMessage("");
      setPrice("");
      router.refresh();
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.error.message : "تعذر إرسال العرض.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Card className="mt-4">
      <h2 dir="rtl" className="mb-3 font-display text-base font-extrabold text-navy-950">
        قدّم عرضك على هذا الطلب
      </h2>
      <form dir="rtl" onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        <FormField label="رسالتك">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="اشرح كيف يمكنك تلبية هذا الطلب..."
            required
          />
        </FormField>
        <FormField label="السعر المقترح (اختياري)" hint="اتركه فارغًا إن كان السعر قابلاً للتفاوض">
          <Input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
          />
        </FormField>
        <Button type="submit" disabled={isBusy} className="w-full sm:w-auto">
          {isBusy ? "جارٍ الإرسال..." : "إرسال العرض"}
        </Button>
      </form>
    </Card>
  );
}
