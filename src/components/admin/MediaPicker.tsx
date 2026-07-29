"use client";

/**
 * Reusable "choose an existing image from the Media Library" picker —
 * Media Library CMS integration task. Any Admin CMS screen that has an
 * image slot (a category icon, a homepage section image, a static
 * page's SEO image, etc.) can drop this in instead of only offering a
 * fresh upload, so existing Media Library assets become reusable
 * across the CMS rather than re-uploaded every time.
 *
 * Reuses the exact same read path the Media Library screen itself
 * uses (`listMediaAction`, see
 * src/app/admin/(protected)/media/actions.ts) — no second "list media"
 * implementation, no new API route. Selecting an image only ever
 * returns its existing `{ id, url }`; this component never uploads,
 * replaces, or deletes anything itself — those stay exclusively on the
 * Media Library screen.
 */

import { useEffect, useState } from "react";
import { ImagePlus, Search, X, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { listMediaAction } from "@/app/admin/(protected)/media/actions";
import type { AdminMediaItem } from "@/services/admin/media-library.service";

export interface MediaPickerValue {
  id: string;
  url: string;
}

export function MediaPicker({
  value,
  onChange,
  label = "اختيار من مكتبة الوسائط",
}: {
  value: MediaPickerValue | null;
  onChange: (media: MediaPickerValue | null) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminMediaItem[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open || items !== null) return;
    listMediaAction().then(setItems);
  }, [open, items]);

  const filtered = (items ?? []).filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return item.fileName.toLowerCase().includes(q) || (item.altText ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.url} alt="" className="h-12 w-12 rounded-lg border border-border object-cover" />
          <Button variant="outline" size="sm" type="button" onClick={() => setOpen(true)}>
            تغيير
          </Button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-lg p-1.5 text-text-400 hover:bg-surface-muted"
            aria-label="إزالة الصورة"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <Button variant="outline" size="sm" type="button" onClick={() => setOpen(true)}>
          <ImagePlus className="h-4 w-4" /> {label}
        </Button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-card bg-white shadow-card-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-display text-base font-bold text-navy-950">اختيار صورة من مكتبة الوسائط</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-text-400 hover:bg-surface-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-border p-3">
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث عن صورة..."
                  className="w-full rounded-lg border border-border-strong py-2 pr-9 pl-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {items === null ? (
                <p className="py-8 text-center text-sm text-text-400">جارٍ التحميل...</p>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-400">
                  لا توجد صور مطابقة. يمكنك رفع صورة جديدة من مكتبة الوسائط ثم العودة لاختيارها هنا.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {filtered.map((item) => {
                    const selected = value?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onChange({ id: item.id, url: item.url });
                          setOpen(false);
                        }}
                        className={`group relative aspect-square overflow-hidden rounded-lg border-2 bg-surface-muted transition ${
                          selected ? "border-teal-500" : "border-transparent hover:border-teal-300"
                        }`}
                        title={item.fileName}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.url} alt={item.altText ?? ""} className="h-full w-full object-cover" />
                        {selected && (
                          <span className="absolute inset-0 flex items-center justify-center bg-teal-600/40">
                            <Check className="h-6 w-6 text-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
