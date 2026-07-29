"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Trash2, RefreshCw, Search, X, Download } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, FormField } from "@/components/ui/Field";
import { EmptyState } from "@/components/admin/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import type {
  AdminMediaItem,
  MediaUsageItem,
  MediaFilterCategory,
} from "@/services/admin/media-library.service";
import { getMediaUsageAction, deleteMediaAction } from "./actions";

const OWNER_LABEL: Record<string, string> = {
  REQUEST: "طلب",
  USER_PROFILE: "ملف مستخدم",
  CATEGORY: "تصنيف",
  PAGE_CONTENT: "محتوى صفحة",
  HOMEPAGE_HERO: "الصفحة الرئيسية",
  SITE_LOGO: "شعار الموقع",
  ADMIN_UPLOAD: "رفع يدوي",
};

/** "Meaningful" filters (replaces the old raw ownerType dropdown) —
 * matches src/services/admin/media-library.service.ts's
 * `MediaFilterCategory`, computed there from each image's ACTUAL
 * current usage rather than how it was originally uploaded. "المدونة"
 * always shows zero results — no Blog system exists in this schema
 * yet (out of scope for this Media Library task); it's kept as a
 * selectable filter per this task's requirements and will start
 * matching real content automatically once a Blog system links
 * `Media` rows the same way every other entity here already does. */
const CATEGORY_FILTERS: { value: MediaFilterCategory; label: string }[] = [
  { value: "all", label: "كل الصور" },
  { value: "homepage", label: "الصفحة الرئيسية" },
  { value: "categories", label: "التصنيفات" },
  { value: "requests", label: "الطلبات" },
  { value: "static_pages", label: "الصفحات الثابتة" },
  { value: "blog", label: "المدونة" },
  { value: "users", label: "المستخدمون" },
  { value: "seo", label: "SEO" },
  { value: "uploaded", label: "مرفوعة يدوياً" },
  { value: "unused", label: "غير مستخدمة" },
];

function formatSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Media Library — Admin real, database-backed screen. Reuses the
 * existing Media model (via src/services/admin/media-library.service.ts)
 * and the existing Cloudinary upload pipeline; reuses the same visual
 * language (Card/Badge/Toast/ConfirmDialog) established across every
 * other CMS screen in this Admin Dashboard.
 *
 * Delete flow: a plain, empty-usage image goes through the standard
 * shared `useConfirm()` dialog (same as every other "safe delete" in
 * this CMS). An image that IS currently used elsewhere instead opens a
 * small inline panel listing exactly where — `useConfirm()`'s message
 * is plain text only and can't render that list, so this one case
 * needs its own lightweight confirmation UI rather than stretching the
 * shared dialog's contract for every other screen that uses it.
 */
export function MediaLibraryManager({ initialItems }: { initialItems: AdminMediaItem[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MediaFilterCategory>("all");
  const [lightboxItem, setLightboxItem] = useState<AdminMediaItem | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploadError, setUploadError] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [usagePanel, setUsagePanel] = useState<{ item: AdminMediaItem; usage: MediaUsageItem[] } | null>(null);

  const uploadFileRef = useRef<HTMLInputElement>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialItems.filter((item) => {
      if (categoryFilter !== "all" && !item.categories.includes(categoryFilter)) return false;
      if (!q) return true;
      return (
        item.fileName.toLowerCase().includes(q) ||
        (item.altText ?? "").toLowerCase().includes(q) ||
        item.usage.some((u) => u.label.toLowerCase().includes(q) || u.type.toLowerCase().includes(q))
      );
    });
  }, [initialItems, search, categoryFilter]);

  function openUploadForm() {
    setUploadAlt("");
    setUploadError(undefined);
    setShowUpload(true);
  }

  async function handleUploadSubmit() {
    const file = uploadFileRef.current?.files?.[0];
    if (!file) {
      setUploadError("اختر ملف صورة أولاً.");
      return;
    }
    setUploadError(undefined);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    if (uploadAlt.trim()) formData.append("altText", uploadAlt.trim());

    try {
      const res = await fetch("/api/admin/media", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setUploadError(json?.error?.message ?? "تعذر رفع الصورة.");
        return;
      }
      showToast("تم رفع الصورة بنجاح.", "success");
      setShowUpload(false);
      router.refresh();
    } catch {
      setUploadError("تعذر رفع الصورة. تحقق من اتصالك وحاول مرة أخرى.");
    } finally {
      setIsUploading(false);
    }
  }

  function triggerReplace(item: AdminMediaItem) {
    setReplacingId(item.id);
    replaceFileRef.current?.click();
  }

  async function handleReplaceFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const mediaId = replacingId;
    e.target.value = "";
    setReplacingId(null);
    if (!file || !mediaId) return;

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/media/${mediaId}`, { method: "POST", body: formData });
        const json = await res.json();
        if (!res.ok) {
          showToast(json?.error?.message ?? "تعذر استبدال الصورة.", "error");
          return;
        }
        showToast("تم استبدال الصورة بنجاح — كل الأماكن التي تستخدمها تحدّثت تلقائياً.", "success");
        router.refresh();
      } catch {
        showToast("تعذر استبدال الصورة. تحقق من اتصالك وحاول مرة أخرى.", "error");
      }
    });
  }

  async function handleDeleteClick(item: AdminMediaItem) {
    if (!item.isReferenced) {
      const confirmed = await confirm({
        title: "حذف هذه الصورة؟",
        message: "لا يمكن التراجع عن هذا الإجراء.",
        confirmLabel: "حذف",
        danger: true,
      });
      if (!confirmed) return;
      runDelete(item.id, false);
      return;
    }

    const usage = await getMediaUsageAction(item.id);
    setUsagePanel({ item, usage });
  }

  function runDelete(mediaId: string, force: boolean) {
    startTransition(async () => {
      const result = await deleteMediaAction(mediaId, force);
      if (!result.success) {
        showToast(result.error ?? "تعذر حذف الصورة.", "error");
        return;
      }
      showToast("تم حذف الصورة بنجاح.", "success");
      setUsagePanel(null);
      setLightboxItem(null);
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader
        title="مكتبة الوسائط"
        description="مصدر واحد لكل الصور المستخدمة في المنصة — الطلبات، التصنيفات، الصفحة الرئيسية، الصفحات الثابتة، والملفات الشخصية"
        actions={
          <Button onClick={openUploadForm}>
            <UploadCloud className="h-4 w-4" /> رفع صورة جديدة
          </Button>
        }
      />

      {/* Hidden input reused for every "replace" click — one input,
          the target media id is tracked in `replacingId`. */}
      <input
        ref={replaceFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleReplaceFileChosen}
      />

      {showUpload && (
        <div className="mb-6 rounded-card border border-border bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-navy-950">رفع صورة جديدة</h3>
            <button
              onClick={() => setShowUpload(false)}
              className="rounded-lg p-1.5 text-text-400 hover:bg-surface-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {uploadError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
              {uploadError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="ملف الصورة" hint="JPEG أو PNG أو WEBP أو GIF — حتى 5 ميغابايت">
              <input
                ref={uploadFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="block w-full text-sm text-text-500 file:me-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-bold file:text-teal-700 hover:file:bg-teal-100"
              />
            </FormField>
            <FormField label="نص بديل (Alt Text) — اختياري">
              <Input value={uploadAlt} onChange={(e) => setUploadAlt(e.target.value)} placeholder="وصف مختصر للصورة" />
            </FormField>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowUpload(false)} disabled={isUploading}>
              إلغاء
            </Button>
            <Button onClick={handleUploadSubmit} disabled={isUploading}>
              {isUploading ? "جارٍ الرفع..." : "رفع الصورة"}
            </Button>
          </div>
        </div>
      )}

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث عن صورة..."
              className="w-full rounded-lg border border-border-strong py-2 pr-9 pl-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <div className="w-48">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as MediaFilterCategory)}
            >
              {CATEGORY_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-text-400">{filtered.length.toLocaleString("ar")} عنصر</p>
        </div>

        <div className="p-4">
          {filtered.length === 0 ? (
            <EmptyState
              title="لا توجد صور"
              description="ابدأ برفع أول صورة لمكتبة الوسائط، أو جرّب كلمة بحث أو تصفية مختلفة."
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {filtered.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-lg border border-border bg-white">
                  <div className="group relative aspect-square bg-surface-muted">
                    <button
                      type="button"
                      onClick={() => setLightboxItem(item)}
                      className="block h-full w-full"
                      aria-label="معاينة الصورة"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.altText ?? ""}
                        className="h-full w-full object-cover transition group-hover:opacity-80"
                      />
                    </button>
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-navy-950/0 opacity-0 transition group-hover:bg-navy-950/40 group-hover:opacity-100">
                      <button
                        onClick={() => triggerReplace(item)}
                        disabled={isPending}
                        className="pointer-events-auto rounded-lg bg-white/90 p-2 text-navy-950 transition hover:bg-white disabled:opacity-50"
                        title="استبدال"
                        aria-label="استبدال الصورة"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item)}
                        disabled={isPending}
                        className="pointer-events-auto rounded-lg bg-white/90 p-2 text-red-600 transition hover:bg-white disabled:opacity-50"
                        title="حذف"
                        aria-label="حذف الصورة"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-navy-950/70 px-1.5 py-0.5 text-[10px] text-white">
                      {OWNER_LABEL[item.ownerType] ?? item.ownerType}
                    </span>
                    {item.isReferenced && (
                      <span className="pointer-events-none absolute left-1 top-1">
                        <Badge tone="info">مستخدمة</Badge>
                      </span>
                    )}
                  </div>
                  {/* File name / dimensions / usage count — visible in
                      the grid itself, not only behind the lightbox
                      click (per this task's "every image must
                      display..." requirement). */}
                  <div className="space-y-0.5 p-2">
                    <p className="truncate text-xs font-semibold text-navy-950" title={item.fileName}>
                      {item.fileName}
                    </p>
                    <p className="truncate text-[11px] text-text-400">
                      {item.width && item.height ? `${item.width}×${item.height}` : "—"} · {formatSize(item.sizeBytes)}
                    </p>
                    <p className="text-[11px] text-text-400">
                      {item.usageCount > 0
                        ? `مستخدمة في ${item.usageCount.toLocaleString("ar")} ${item.usageCount === 1 ? "مكان" : "أماكن"}`
                        : "غير مستخدمة"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Lightbox */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 p-4"
          onClick={() => setLightboxItem(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-card bg-white shadow-card-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-display text-base font-bold text-navy-950">
                {lightboxItem.altText || "معاينة الصورة"}
              </h3>
              <button
                onClick={() => setLightboxItem(null)}
                className="rounded-lg p-1.5 text-text-400 hover:bg-surface-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex max-h-[60vh] items-center justify-center bg-surface-muted p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxItem.url}
                alt={lightboxItem.altText ?? ""}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-border p-4 text-xs text-text-500 sm:grid-cols-4">
              <p className="truncate" title={lightboxItem.fileName}>
                الملف: {lightboxItem.fileName}
              </p>
              <p>النوع: {OWNER_LABEL[lightboxItem.ownerType] ?? lightboxItem.ownerType}</p>
              <p>
                الأبعاد: {lightboxItem.width && lightboxItem.height ? `${lightboxItem.width}×${lightboxItem.height}` : "—"}
              </p>
              <p>الحجم: {formatSize(lightboxItem.sizeBytes)}</p>
              <p>تاريخ الرفع: {formatDate(lightboxItem.createdAt)}</p>
              <p>{lightboxItem.isReferenced ? `مستخدمة في ${lightboxItem.usageCount.toLocaleString("ar")} مكان` : "غير مستخدمة"}</p>
            </div>
            {lightboxItem.usage.length > 0 && (
              <div className="space-y-1.5 border-t border-border p-4">
                <p className="text-xs font-bold text-navy-950">مستخدمة في:</p>
                {lightboxItem.usage.map((u, i) => (
                  <p key={i} className="text-xs text-text-500">
                    • <span className="font-semibold text-navy-950">{u.type}</span> — {u.label}
                  </p>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2 border-t border-border p-4">
              <a
                href={lightboxItem.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-teal-600 hover:bg-teal-50"
              >
                <Download className="h-4 w-4" /> فتح الأصل
              </a>
              <Button variant="ghost" onClick={() => triggerReplace(lightboxItem)}>
                <RefreshCw className="h-4 w-4" /> استبدال
              </Button>
              <Button
                variant="ghost"
                className="text-red-600 hover:bg-red-50"
                onClick={() => handleDeleteClick(lightboxItem)}
              >
                <Trash2 className="h-4 w-4" /> حذف
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Usage-aware delete panel — only shown when the image IS in
          use somewhere; a not-in-use image uses the plain shared
          confirm dialog instead (see handleDeleteClick). */}
      {usagePanel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 p-4"
          onClick={() => setUsagePanel(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-card bg-white shadow-card-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border p-5">
              <h3 className="font-display text-lg font-bold text-navy-950">هذه الصورة مستخدمة حالياً</h3>
              <p className="mt-1 text-sm text-text-500">حذفها سيؤثر على الأماكن التالية. تأكد قبل المتابعة:</p>
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto p-5">
              {usagePanel.usage.map((u, i) => (
                <div key={i} className="rounded-lg bg-surface-muted px-3 py-2 text-sm">
                  <span className="font-bold text-navy-950">{u.type}</span>
                  <span className="text-text-500"> — {u.label}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-4">
              <Button variant="ghost" onClick={() => setUsagePanel(null)}>
                إلغاء
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                disabled={isPending}
                onClick={() => runDelete(usagePanel.item.id, true)}
              >
                {isPending ? "جارٍ الحذف..." : "حذف رغم ذلك"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
