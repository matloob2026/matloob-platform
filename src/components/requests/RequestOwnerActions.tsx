"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import type { RequestStatus } from "@/types/domain";

export function RequestOwnerActions({ requestId, status }: { requestId: string; status: RequestStatus }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = await confirm({
      title: "حذف الطلب",
      message: "هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.",
      confirmLabel: "حذف",
      danger: true,
    });
    if (!confirmed) return;

    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/requests/${requestId}`, { method: "DELETE" });
      showToast("تم حذف الطلب", "success");
      router.push("/my-requests");
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.error.message : "تعذر حذف الطلب.";
      setError(message);
      showToast(message, "error");
      setIsBusy(false);
    }
  }

  async function handlePublish() {
    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/requests/${requestId}/publish`, { method: "POST" });
      showToast("تم نشر الطلب", "success");
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.error.message : "تعذر نشر الطلب.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleClose() {
    const confirmed = await confirm({
      title: "إغلاق الطلب",
      message: "هل تريد إغلاق هذا الطلب؟ لن يتمكن الموردون من تقديم عروض جديدة بعد الإغلاق.",
      confirmLabel: "إغلاق",
    });
    if (!confirmed) return;

    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/requests/${requestId}/close`, { method: "POST" });
      showToast("تم إغلاق الطلب", "success");
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.error.message : "تعذر إغلاق الطلب.";
      setError(message);
      showToast(message, "error");
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
