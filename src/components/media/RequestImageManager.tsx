"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import type { RequestMedia } from "@/types/domain";

export function RequestImageManager({
  requestId,
  initialImages,
}: {
  requestId: string;
  initialImages: RequestMedia[];
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<RequestMedia[]>(
    [...initialImages].sort((a, b) => a.sortOrder - b.sortOrder)
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setIsUploading(true);

    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.set("file", file);
        const { data } = await apiFetch<{ data: RequestMedia }>(
          `/api/media/requests/${requestId}`,
          { method: "POST", body: formData }
        );
        setImages((prev) => [...prev, data]);
      }
      router.refresh();
      showToast("تم رفع الصورة", "success");
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.error.message : "تعذر رفع الصورة.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function persistOrder(next: RequestMedia[]) {
    setImages(next);
    try {
      await apiFetch(`/api/media/requests/${requestId}/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ orderedIds: next.map((img) => img.id) }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : "تعذر حفظ ترتيب الصور.");
    }
  }

  function moveImage(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const next = [...images];
    const a = next[index];
    const b = next[targetIndex];
    if (!a || !b) return;
    next[index] = b;
    next[targetIndex] = a;
    void persistOrder(next);
  }

  async function handleDelete(mediaId: string) {
    const confirmed = await confirm({
      title: "حذف الصورة",
      message: "هل تريد حذف هذه الصورة؟",
      confirmLabel: "حذف",
      danger: true,
    });
    if (!confirmed) return;

    setIsBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/media/${mediaId}`, { method: "DELETE" });
      setImages((prev) => prev.filter((img) => img.id !== mediaId));
      showToast("تم حذف الصورة", "success");
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.error.message : "تعذر حذف الصورة.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div dir="rtl" className="mt-4 space-y-3 border-t border-border pt-4">
      <p className="text-sm font-semibold text-navy-950">صور الطلب</p>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img, index) => (
            <div key={img.id} className="group relative overflow-hidden rounded-lg border border-border">
              {/* next/image: automatic optimization, responsive srcset, lazy loading by default */}
              <div className="relative h-24 w-full sm:h-28">
                <Image
                  src={img.url}
                  alt={img.altText ?? "صورة الطلب"}
                  fill
                  sizes="(max-width: 640px) 33vw, 25vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/50 px-1.5 py-1">
                <button
                  type="button"
                  onClick={() => moveImage(index, -1)}
                  disabled={index === 0 || isBusy}
                  className="text-xs text-white disabled:opacity-30"
                  aria-label="تحريك لليمين"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  disabled={isBusy}
                  className="text-xs text-white hover:text-red-300 disabled:opacity-30"
                  aria-label="حذف الصورة"
                >
                  حذف
                </button>
                <button
                  type="button"
                  onClick={() => moveImage(index, 1)}
                  disabled={index === images.length - 1 || isBusy}
                  className="text-xs text-white disabled:opacity-30"
                  aria-label="تحريك لليسار"
                >
                  ▶
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading || images.length >= 10}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? "جارٍ الرفع..." : "إضافة صور"}
        </Button>
        <span className="mr-2 text-xs text-text-400">JPEG/PNG/WEBP/GIF، حتى 5 ميجابايت لكل صورة، بحد أقصى 10 صور</span>
      </div>
    </div>
  );
}
