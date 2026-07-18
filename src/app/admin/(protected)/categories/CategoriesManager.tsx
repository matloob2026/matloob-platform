"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField, Toggle } from "@/components/ui/Field";
import { TranslationTabs } from "@/components/admin/TranslationTabs";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import type { AdminCategoryListItem } from "@/services/admin/category.service";
import {
  createCategoryAction,
  updateCategoryAction,
  setCategoryActiveAction,
  deleteCategoryAction,
} from "./actions";

const PAGE_SIZE = 20;

interface FormValues {
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  isActive: boolean;
  sortOrder: number;
}

const EMPTY_FORM: FormValues = {
  slug: "",
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  isActive: true,
  sortOrder: 0,
};

function toFormValues(category: AdminCategoryListItem): FormValues {
  return {
    slug: category.slug,
    nameAr: category.nameAr,
    nameEn: category.nameEn,
    descriptionAr: category.descriptionAr ?? "",
    descriptionEn: category.descriptionEn ?? "",
    isActive: category.isActive,
    sortOrder: category.sortOrder,
  };
}

/** Real, database-backed Categories management — Checkpoint 01 of the
 * CMS. Reuses the existing Category/CategoryTranslation model and the
 * existing DataTable/TranslationTabs/PageHeader admin components. */
export function CategoriesManager({ initialCategories }: { initialCategories: AdminCategoryListItem[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<FormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | undefined>();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialCategories;
    return initialCategories.filter(
      (c) => c.nameAr.includes(search.trim()) || c.nameEn.toLowerCase().includes(q) || c.slug.includes(q)
    );
  }, [initialCategories, search]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openCreateForm() {
    setEditingId(null);
    setFormValues(EMPTY_FORM);
    setFormError(undefined);
    setShowForm(true);
  }

  function openEditForm(category: AdminCategoryListItem) {
    setEditingId(category.id);
    setFormValues(toFormValues(category));
    setFormError(undefined);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setFormError(undefined);
  }

  function handleSave() {
    setFormError(undefined);
    startTransition(async () => {
      const input = {
        slug: formValues.slug.trim(),
        nameAr: formValues.nameAr.trim(),
        nameEn: formValues.nameEn.trim(),
        descriptionAr: formValues.descriptionAr.trim() || null,
        descriptionEn: formValues.descriptionEn.trim() || null,
        isActive: formValues.isActive,
        sortOrder: formValues.sortOrder,
      };

      const result = editingId
        ? await updateCategoryAction(editingId, input)
        : await createCategoryAction(input);

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      showToast(editingId ? "تم تحديث التصنيف بنجاح." : "تم إضافة التصنيف بنجاح.", "success");
      setShowForm(false);
      router.refresh();
    });
  }

  function handleToggleActive(category: AdminCategoryListItem) {
    startTransition(async () => {
      const result = await setCategoryActiveAction(category.id, !category.isActive);
      if (!result.success) {
        showToast(result.error ?? "تعذر تحديث حالة التصنيف.", "error");
        return;
      }
      showToast(!category.isActive ? "تم تفعيل التصنيف." : "تم تعطيل التصنيف.", "success");
      router.refresh();
    });
  }

  async function handleDelete(category: AdminCategoryListItem) {
    const confirmed = await confirm({
      title: `حذف "${category.nameAr}"؟`,
      message: "لا يمكن التراجع عن هذا الإجراء. سيتم رفض الحذف تلقائياً إذا كان التصنيف مستخدماً في أي طلب.",
      confirmLabel: "حذف",
      danger: true,
    });
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteCategoryAction(category.id);
      if (!result.success) {
        showToast(result.error ?? "تعذر حذف التصنيف.", "error");
        return;
      }
      showToast("تم حذف التصنيف بنجاح.", "success");
      router.refresh();
    });
  }

  const columns: DataTableColumn<AdminCategoryListItem>[] = [
    {
      key: "name",
      header: "التصنيف",
      render: (c) => (
        <div>
          <p className="font-bold text-navy-950">{c.nameAr}</p>
          <p className="text-xs text-text-400">{c.nameEn}</p>
        </div>
      ),
    },
    { key: "slug", header: "الرابط", render: (c) => <code className="text-xs" dir="ltr">/{c.slug}</code> },
    { key: "count", header: "عدد الطلبات", render: (c) => c.requestCount.toLocaleString("ar") },
    {
      key: "status",
      header: "الحالة",
      render: (c) => (
        <button onClick={() => handleToggleActive(c)} disabled={isPending} className="disabled:opacity-50">
          <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "مفعّل" : "معطّل"}</Badge>
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEditForm(c)}
            className="rounded-lg p-2 text-text-400 transition hover:bg-surface-muted hover:text-teal-600"
            aria-label="تعديل"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(c)}
            disabled={isPending}
            className="rounded-lg p-2 text-text-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label="حذف"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
      className: "w-20",
    },
  ];

  return (
    <div>
      <PageHeader
        title="التصنيفات"
        description="إدارة تصنيفات الطلبات الظاهرة في الصفحة الرئيسية — متصلة مباشرة بقاعدة البيانات"
        actions={
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4" /> إضافة تصنيف
          </Button>
        }
      />

      {showForm && (
        <div className="mb-6 rounded-card border border-border bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-navy-950">
              {editingId ? "تعديل التصنيف" : "تصنيف جديد"}
            </h3>
            <button onClick={closeForm} className="rounded-lg p-1.5 text-text-400 hover:bg-surface-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
              {formError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TranslationTabs
              render={(locale) => (
                <div className="space-y-4">
                  <FormField label={locale === "ar" ? "الاسم (عربي)" : "Name (English)"}>
                    <Input
                      placeholder={locale === "ar" ? "مثال: عقارات" : "e.g. Real Estate"}
                      value={locale === "ar" ? formValues.nameAr : formValues.nameEn}
                      onChange={(e) =>
                        setFormValues((v) =>
                          locale === "ar" ? { ...v, nameAr: e.target.value } : { ...v, nameEn: e.target.value }
                        )
                      }
                    />
                  </FormField>
                  <FormField label={locale === "ar" ? "الوصف (اختياري)" : "Description (optional)"}>
                    <Textarea
                      rows={3}
                      value={locale === "ar" ? formValues.descriptionAr : formValues.descriptionEn}
                      onChange={(e) =>
                        setFormValues((v) =>
                          locale === "ar"
                            ? { ...v, descriptionAr: e.target.value }
                            : { ...v, descriptionEn: e.target.value }
                        )
                      }
                    />
                  </FormField>
                </div>
              )}
            />
            <div className="space-y-4">
              <FormField label="الرابط (Slug)" hint="يُستخدم في رابط الصفحة، أحرف إنجليزية صغيرة وأرقام وشرطات فقط">
                <Input
                  placeholder="real-estate"
                  dir="ltr"
                  value={formValues.slug}
                  onChange={(e) => setFormValues((v) => ({ ...v, slug: e.target.value }))}
                />
              </FormField>
              <FormField label="ترتيب العرض">
                <Input
                  type="number"
                  dir="ltr"
                  value={formValues.sortOrder}
                  onChange={(e) => setFormValues((v) => ({ ...v, sortOrder: Number(e.target.value) || 0 }))}
                />
              </FormField>
              <FormField label="الأيقونة / الصورة">
                <Button variant="outline" size="sm" type="button" disabled>
                  اختيار من مكتبة الوسائط (قريباً)
                </Button>
              </FormField>
              <Toggle
                checked={formValues.isActive}
                onChange={(value) => setFormValues((v) => ({ ...v, isActive: value }))}
                label="مفعّل"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={closeForm} disabled={isPending}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "جارٍ الحفظ..." : "حفظ التصنيف"}
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={paged}
        getRowId={(c) => c.id}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="بحث عن تصنيف..."
        page={page}
        pageSize={PAGE_SIZE}
        totalItems={filtered.length}
        onPageChange={setPage}
        emptyTitle="لا توجد تصنيفات"
        emptyDescription="ابدأ بإضافة أول تصنيف للمنصة."
      />
    </div>
  );
}
