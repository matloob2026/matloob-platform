"use client";

import { useEffect, useState } from "react";
import { Plus, GripVertical, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, FormField, Toggle } from "@/components/ui/Field";
import { TranslationTabs } from "@/components/admin/TranslationTabs";
import { listCategoriesMock, type AdminCategoryRow } from "@/services/mock/categories.mock";

export default function AdminCategoriesPage() {
  const [rows, setRows] = useState<AdminCategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    listCategoriesMock().then((data) => {
      setRows(data);
      setIsLoading(false);
    });
  }, []);

  const filtered = rows.filter(
    (c) => c.nameAr.includes(search) || c.nameEn.toLowerCase().includes(search.toLowerCase())
  );

  const columns: DataTableColumn<AdminCategoryRow>[] = [
    {
      key: "order",
      header: "",
      render: () => <GripVertical className="h-4 w-4 cursor-grab text-text-400" />,
      className: "w-8",
    },
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
    { key: "slug", header: "الرابط", render: (c) => <code className="text-xs">/{c.slug}</code> },
    { key: "count", header: "عدد الطلبات", render: (c) => c.requestCount.toLocaleString() },
    {
      key: "status",
      header: "الحالة",
      render: (c) => <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "مفعّل" : "معطّل"}</Badge>,
    },
    {
      key: "actions",
      header: "",
      render: () => (
        <div className="flex items-center gap-1">
          <button className="rounded-lg p-2 text-text-400 transition hover:bg-surface-muted hover:text-teal-600">
            <Pencil className="h-4 w-4" />
          </button>
          <button className="rounded-lg p-2 text-text-400 transition hover:bg-red-50 hover:text-red-600">
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
        description="إدارة تصنيفات الطلبات الظاهرة في الصفحة الرئيسية"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> إضافة تصنيف
          </Button>
        }
      />

      {showForm && (
        <div className="mb-6 rounded-card border border-border bg-white p-6 shadow-card">
          <h3 className="mb-4 font-display text-lg font-bold text-navy-950">تصنيف جديد</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <TranslationTabs
              render={(locale) => (
                <FormField label={locale === "ar" ? "الاسم (عربي)" : "Name (English)"}>
                  <Input placeholder={locale === "ar" ? "مثال: عقارات" : "e.g. Real Estate"} />
                </FormField>
              )}
            />
            <div className="space-y-4">
              <FormField label="الرابط (Slug)" hint="يُستخدم في رابط الصفحة، أحرف إنجليزية فقط">
                <Input placeholder="real-estate" dir="ltr" />
              </FormField>
              <FormField label="الأيقونة / الصورة">
                <Button variant="outline" size="sm" type="button">
                  اختيار من مكتبة الوسائط
                </Button>
              </FormField>
              <Toggle checked={true} onChange={() => {}} label="مفعّل" />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              إلغاء
            </Button>
            <Button>حفظ التصنيف</Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(c) => c.id}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث عن تصنيف..."
        page={1}
        pageSize={20}
        totalItems={filtered.length}
        onPageChange={() => {}}
        emptyTitle="لا توجد تصنيفات"
        emptyDescription="ابدأ بإضافة أول تصنيف للمنصة."
      />
    </div>
  );
}
