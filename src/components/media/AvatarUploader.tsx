"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { apiFetch, ApiRequestError } from "@/lib/api-client";

export function AvatarUploader({ initialAvatarUrl }: { initialAvatarUrl?: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(initialAvatarUrl);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justUpdated, setJustUpdated] = useState<"uploaded" | "removed" | null>(null);

  async function handleFileSelected(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setIsBusy(true);
    setError(null);
    setJustUpdated(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const { data } = await apiFetch<{ data: { url: string } }>("/api/media/avatar", {
        method: "POST",
        body: formData,
      });
      setAvatarUrl(data.url);
      setJustUpdated("uploaded");
      showToast("تم رفع الصورة", "success");
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.error.message : "تعذر رفع الصورة.";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    const confirmed = await confirm({
      title: "حذف الصورة",
      message: "هل تريد حذف صورة الملف الشخصي؟",
      confirmLabel: "حذف",
      danger: true,
    });
    if (!confirmed) return;

    setIsBusy(true);
    setError(null);
    setJustUpdated(null);
    try {
      await apiFetch("/api/media/avatar", { method: "DELETE" });
      setAvatarUrl(undefined);
      setJustUpdated("removed");
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

  function handleSavePhoto() {
    // The image already auto-uploads on selection — this button exists
    // because users expect an explicit confirmation action even when
    // autosave is already in effect (removes ambiguity/psychological
    // uncertainty about whether the change "took").
    showToast("تم حفظ الصورة", "success");
  }

  return (
    <div dir="rtl" className="flex flex-col items-center gap-3">
      <div className="relative h-24 w-24 overflow-hidden rounded-full border border-border bg-surface-muted">
        {avatarUrl ? (
          <Image src={avatarUrl} alt="صورة الملف الشخصي" fill sizes="96px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-text-400">؟</div>
        )}
      </div>

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      {justUpdated === "uploaded" && (
        <p className="flex items-center gap-1 text-xs font-semibold text-teal-700">
          <span aria-hidden="true">✓</span> تم تحديث الصورة فوراً
        </p>
      )}
      {justUpdated === "removed" && (
        <p className="flex items-center gap-1 text-xs font-semibold text-teal-700">
          <span aria-hidden="true">✓</span> تم حذف الصورة
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files)}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isBusy}
          onClick={() => fileInputRef.current?.click()}
        >
          {avatarUrl ? "استبدال الصورة" : "رفع صورة"}
        </Button>
        {avatarUrl && (
          <Button type="button" variant="danger" size="sm" disabled={isBusy} onClick={handleRemove}>
            حذف الصورة
          </Button>
        )}
      </div>
      <Button type="button" variant="primary" size="sm" disabled={isBusy || !avatarUrl} onClick={handleSavePhoto}>
        حفظ الصورة
      </Button>
      <p className="text-xs text-text-400">JPEG/PNG/WEBP/GIF، حتى 5 ميجابايت</p>
    </div>
  );
}
