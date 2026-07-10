"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import type { RequestStatus } from "@/types/domain";

export function RequestOwnerActions({ requestId, status }: { requestId: string; status: RequestStatus }) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/requests/${requestId}`, { method: "DELETE" });
      router.push("/my-requests");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : "تعذر حذف الطلب.");
      setIsBusy(false);
    }
  }

  async function handlePublish() {
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/requests/${requestId}/publish`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : "تعذر نشر الطلب.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleClose() {
    if (!window.confirm("هل تريد إغلاق هذا الطلب؟ لن يتمكن الموردون من تقديم عروض جديدة بعد الإغلاق.")) return;
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/requests/${requestId}/close`, { method: "POST" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : "تعذر إغلاق الطلب.");
    } finally {
      setIsBusy(false);
    }
  }

  const canEdit = status === "DRAFT" || status === "PUBLISHED";
  const canPublish = status === "DRAFT";
  const canClose = status === "PUBLISHED" || status === "IN_PROGRESS";

  return (
    <div dir="rtl" className="mt-4 space-y-3 border-t border-border pt-4">
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <Link href={`/requests/${requestId}/edit`}>
            <Button variant="outline" size="sm" type="button">
              تعديل الطلب
            </Button>
          </Link>
        )}
        {canPublish && (
          <Button variant="primary" size="sm" onClick={handlePublish} disabled={isBusy}>
            نشر الطلب
          </Button>
        )}
        {canClose && (
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isBusy}>
            إغلاق الطلب
          </Button>
        )}
        <Button variant="danger" size="sm" onClick={handleDelete} disabled={isBusy}>
          حذف الطلب
        </Button>
      </div>
    </div>
  );
}
