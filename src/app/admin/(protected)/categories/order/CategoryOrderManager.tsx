"use client";

import { useState, useRef, useTransition } from "react";
import { GripVertical, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import type { AdminCategoryListItem } from "@/services/admin/category.service";
import { saveCategoryOrderAction } from "./actions";

/** Category Ordering — Admin. Plain native HTML5 drag-and-drop (no new
 * library) over the existing category list; "Save order" writes the
 * new sequence to the EXISTING `sortOrder` field via
 * `reorderCategories` — the same field the homepage's first-6 grid
 * and the full /categories page already read. "Reset" just restores
 * the order this screen loaded with, without saving. */
export function CategoryOrderManager({ initialCategories }: { initialCategories: AdminCategoryListItem[] }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<AdminCategoryListItem[]>(initialCategories);
  const [isDirty, setIsDirty] = useState(false);
  const dragIndex = useRef<number | null>(null);

  function handleDragStart(index: number) {
    dragIndex.current = index;
  }

  function handleDragOver(e: React.DragEvent, overIndex: number) {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === overIndex) return;

    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      if (!moved) return prev;
      next.splice(overIndex, 0, moved);
      return next;
    });
    dragIndex.current = overIndex;
    setIsDirty(true);
  }

  function handleDragEnd() {
    dragIndex.current = null;
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveCategoryOrderAction(items.map((c) => c.id));
      if (!result.success) {
        showToast(result.error ?? "تعذر حفظ الترتيب.", "error");
        return;
      }
      showToast("تم حفظ ترتيب التصنيفات — سينعكس فوراً على الصفحة الرئيسية وصفحة كل التصنيفات.", "success");
      setIsDirty(false);
    });
  }

  function handleReset() {
    setItems(initialCategories);
    setIsDirty(false);
  }

  return (
    <div>
      <PageHeader
        title="ترتيب التصنيفات"
        description="هذا الترتيب سيظهر في الصفحة الرئيسية (أول 6 تصنيفات) وسيتم تطبيقه أيضاً في صفحة كل التصنيفات"
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleReset} disabled={!isDirty || isPending}>
              <RotateCcw className="h-4 w-4" /> استعادة الترتيب الأصلي
            </Button>
            <Button onClick={handleSave} disabled={!isDirty || isPending}>
              {isPending ? "جارٍ الحفظ..." : "حفظ الترتيب"}
            </Button>
          </div>
        }
      />

      <Card>
        <div className="space-y-2">
          {items.map((category, index) => (
            <div
              key={category.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className="flex cursor-grab items-center gap-3 rounded-xl border border-border bg-white p-3 shadow-sm transition active:cursor-grabbing"
            >
              <GripVertical className="h-5 w-5 flex-shrink-0 text-text-400" />
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-teal-50 text-xs font-bold text-teal-700">
                {(index + 1).toLocaleString("ar")}
              </span>
              {category.imageMedia?.url || category.iconMedia?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={category.imageMedia?.url ?? category.iconMedia?.url}
                  alt=""
                  className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: "#0f766e" }}
                >
                  {category.nameAr.charAt(0)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-navy-950">{category.nameAr}</p>
                <p className="truncate text-xs text-text-400">{category.requestCount.toLocaleString("ar")} طلب</p>
              </div>
              {index < 6 && <span className="flex-shrink-0 rounded-full bg-teal-100 px-2.5 py-1 text-[11px] font-bold text-teal-700">يظهر في الرئيسية</span>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
