"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiRequestError } from "@/lib/api-client";

export function AvatarUploader({ initialAvatarUrl }: { initialAvatarUrl?: string }) {
  const router = useRouter();
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
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : "تعذر رفع الصورة.");
    } finally {
      setIsBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!window.confirm("هل تريد حذف صورة الملف الشخصي؟")) return;
    setIsBusy(true);
    setError(null);
    setJustUpdated(null);
    try {
      await apiFetch("/api/media/avatar", { method: "DELETE" });
      setAvatarUrl(undefined);
      setJustUpdated("removed");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : "تعذر حذف الصورة.");
    } finally {
      setIsBusy(false);
    }
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
      <p className="text-xs text-text-400">JPEG/PNG/WEBP/GIF، حتى 5 ميجابايت</p>
    </div>
  );
}
