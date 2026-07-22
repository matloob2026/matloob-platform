"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Select, FormField, Toggle } from "@/components/ui/Field";
import { TranslationTabs } from "@/components/admin/TranslationTabs";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import type { AdminCityListItem } from "@/services/admin/city.service";
import type { AdminCountryListItem } from "@/services/admin/country.service";
import { createCityAction, updateCityAction, setCityActiveAction, deleteCityAction } from "./actions";

const PAGE_SIZE = 20;

interface FormValues {
  countryId: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  sortOrder: string;
  isActive: boolean;
}

function emptyForm(defaultCountryId: string): FormValues {
  return { countryId: defaultCountryId, slug: "", nameAr: "", nameEn: "", sortOrder: "0", isActive: true };
}

function toFormValues(city: AdminCityListItem): FormValues {
  return {
    countryId: city.countryId,
    slug: city.slug,
    nameAr: city.nameAr,
    nameEn: city.nameEn,
    sortOrder: String(city.sortOrder),
    isActive: city.isActive,
  };
}

/** Real, database-backed Cities management. Reuses the existing
 * City/CityTranslation model, the existing Countries data (passed in
 * as a prop — no second country/city relationship system), and the
 * same DataTable/TranslationTabs pattern used throughout this CMS. */
export function CitiesManager({
  initialCities,
  countries,
}: {
  initialCities: AdminCityListItem[];
  countries: AdminCountryListItem[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<FormValues>(emptyForm(countries[0]?.id ?? ""));
  const [formError, setFormError] = useState<string | undefined>();

  const byCountry = useMemo(
    () => (countryFilter === "all" ? initialCities : initialCities.filter((c) => c.countryId === countryFilter)),
    [initialCities, countryFilter]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return byCountry;
    return byCountry.filter(
      (c) => c.nameAr.includes(search.trim()) || c.nameEn.toLowerCase().includes(q) || c.slug.includes(q)
    );
  }, [byCountry, search]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openCreateForm() {
    setEditingId(null);
    setFormValues(emptyForm(countryFilter !== "all" ? countryFilter : countries[0]?.id ?? ""));
    setFormError(undefined);
    setShowForm(true);
  }

  function openEditForm(city: AdminCityListItem) {
    setEditingId(city.id);
    setFormValues(toFormValues(city));
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
        countryId: formValues.countryId,
        slug: formValues.slug.trim().toLowerCase(),
        nameAr: formValues.nameAr.trim(),
        nameEn: formValues.nameEn.trim(),
        sortOrder: Number(formValues.sortOrder) || 0,
        isActive: formValues.isActive,
      };

      const result = editingId ? await updateCityAction(editingId, input) : await createCityAction(input);

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      showToast(editingId ? "تم تحديث المدينة بنجاح." : "تم إضافة المدينة بنجاح.", "success");
      setShowForm(false);
      router.refresh();
    });
  }

  function handleToggleActive(city: AdminCityListItem) {
    startTransition(async () => {
      const result = await setCityActiveAction(city.id, !city.isActive);
      if (!result.success) {
        showToast(result.error ?? "تعذر تحديث حالة المدينة.", "error");
        return;
      }
      showToast(!city.isActive ? "تم تفعيل المدينة." : "تم تعطيل المدينة.", "success");
      router.refresh();
    });
  }

  async function handleDelete(city: AdminCityListItem) {
    const confirmed = await confirm({
      title: `حذف "${city.nameAr}"؟`,
      message: "لا يمكن التراجع عن هذا الإجراء. سيتم رفض الحذف تلقائياً إذا كانت المدينة مرتبطة بطلبات أو مستخدمين.",
      confirmLabel: "حذف",
      danger: true,
    });
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteCityAction(city.id);
      if (!result.success) {
        showToast(result.error ?? "تعذر حذف المدينة.", "error");
        return;
      }
      showToast("تم حذف المدينة بنجاح.", "success");
      router.refresh();
    });
  }

  const columns: DataTableColumn<AdminCityListItem>[] = [
    {
      key: "name",
      header: "المدينة",
      render: (c) => (
        <div>
          <p className="font-bold text-navy-950">{c.nameAr}</p>
          <p className="text-xs text-text-400">{c.nameEn}</p>
        </div>
      ),
    },
    {
      key: "country",
      header: "الدولة",
      render: (c) => (
        <span>
          {c.countryNameAr} · <span dir="ltr" className="text-xs text-text-400">{c.countryCode}</span>
        </span>
      ),
    },
    { key: "slug", header: "الرابط", render: (c) => <code className="text-xs" dir="ltr">{c.slug}</code> },
    {
      key: "status",
      header: "الحالة",
      render: (c) => (
        <button onClick={() => handleToggleActive(c)} disabled={isPending} className="disabled:opacity-50">
          <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "مفعّلة" : "معطّلة"}</Badge>
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="w-48">
          <Select
            value={countryFilter}
            onChange={(e) => {
              setCountryFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">كل الدول</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameAr}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={openCreateForm} disabled={countries.length === 0}>
          <Plus className="h-4 w-4" /> إضافة مدينة
        </Button>
      </div>

      {countries.length === 0 && (
        <p className="mb-4 text-sm text-amber-700">أضف دولة واحدة على الأقل من تبويب الدول قبل إضافة مدينة.</p>
      )}

      {showForm && (
        <div className="mb-6 rounded-card border border-border bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-navy-950">{editingId ? "تعديل المدينة" : "مدينة جديدة"}</h3>
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
                <FormField label={locale === "ar" ? "اسم المدينة (عربي)" : "City name (English)"}>
                  <Input
                    placeholder={locale === "ar" ? "الرياض" : "Riyadh"}
                    value={locale === "ar" ? formValues.nameAr : formValues.nameEn}
                    onChange={(e) =>
                      setFormValues((v) =>
                        locale === "ar" ? { ...v, nameAr: e.target.value } : { ...v, nameEn: e.target.value }
                      )
                    }
                  />
                </FormField>
              )}
            />
            <div className="space-y-4">
              <FormField label="الدولة">
                <Select
                  value={formValues.countryId}
                  onChange={(e) => setFormValues((v) => ({ ...v, countryId: e.target.value }))}
                >
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="الرابط (Slug)" hint="فريد ضمن نفس الدولة — أحرف إنجليزية صغيرة وأرقام وشرطات فقط">
                <Input
                  placeholder="riyadh"
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
                  onChange={(e) => setFormValues((v) => ({ ...v, sortOrder: e.target.value }))}
                />
              </FormField>
              <Toggle
                checked={formValues.isActive}
                onChange={(value) => setFormValues((v) => ({ ...v, isActive: value }))}
                label="مفعّلة"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={closeForm} disabled={isPending}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "جارٍ الحفظ..." : "حفظ المدينة"}
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
        searchPlaceholder="بحث عن مدينة..."
        page={page}
        pageSize={PAGE_SIZE}
        totalItems={filtered.length}
        onPageChange={setPage}
        emptyTitle="لا توجد مدن"
        emptyDescription="ابدأ بإضافة أول مدينة ضمن هذه الدولة."
      />
    </div>
  );
}
