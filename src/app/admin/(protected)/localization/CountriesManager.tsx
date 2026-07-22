"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Globe2 } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, FormField, Toggle } from "@/components/ui/Field";
import { TranslationTabs } from "@/components/admin/TranslationTabs";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import type { AdminCountryListItem } from "@/services/admin/country.service";
import { createCountryAction, updateCountryAction, setCountryActiveAction, deleteCountryAction } from "./actions";

const PAGE_SIZE = 20;

interface FormValues {
  code: string;
  nameAr: string;
  nameEn: string;
  phoneDialCode: string;
  isActive: boolean;
  isDefault: boolean;
}

const EMPTY_FORM: FormValues = {
  code: "",
  nameAr: "",
  nameEn: "",
  phoneDialCode: "",
  isActive: true,
  isDefault: false,
};

function toFormValues(country: AdminCountryListItem): FormValues {
  return {
    code: country.code,
    nameAr: country.nameAr,
    nameEn: country.nameEn,
    phoneDialCode: country.phoneDialCode ?? "",
    isActive: country.isActive,
    isDefault: country.isDefault,
  };
}

/** Real, database-backed Countries management. Reuses the existing
 * Country/CountryTranslation model and the same DataTable/
 * TranslationTabs pattern Categories used in Checkpoint 01. */
export function CountriesManager({ initialCountries }: { initialCountries: AdminCountryListItem[] }) {
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
    if (!q) return initialCountries;
    return initialCountries.filter(
      (c) => c.nameAr.includes(search.trim()) || c.nameEn.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [initialCountries, search]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openCreateForm() {
    setEditingId(null);
    setFormValues(EMPTY_FORM);
    setFormError(undefined);
    setShowForm(true);
  }

  function openEditForm(country: AdminCountryListItem) {
    setEditingId(country.id);
    setFormValues(toFormValues(country));
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
        code: formValues.code.trim().toUpperCase(),
        nameAr: formValues.nameAr.trim(),
        nameEn: formValues.nameEn.trim(),
        phoneDialCode: formValues.phoneDialCode.trim() || null,
        isActive: formValues.isActive,
        isDefault: formValues.isDefault,
      };

      const result = editingId ? await updateCountryAction(editingId, input) : await createCountryAction(input);

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      showToast(editingId ? "تم تحديث الدولة بنجاح." : "تم إضافة الدولة بنجاح.", "success");
      setShowForm(false);
      router.refresh();
    });
  }

  function handleToggleActive(country: AdminCountryListItem) {
    startTransition(async () => {
      const result = await setCountryActiveAction(country.id, !country.isActive);
      if (!result.success) {
        showToast(result.error ?? "تعذر تحديث حالة الدولة.", "error");
        return;
      }
      showToast(!country.isActive ? "تم تفعيل الدولة." : "تم تعطيل الدولة.", "success");
      router.refresh();
    });
  }

  async function handleDelete(country: AdminCountryListItem) {
    const confirmed = await confirm({
      title: `حذف "${country.nameAr}"؟`,
      message: "لا يمكن التراجع عن هذا الإجراء. سيتم رفض الحذف تلقائياً إذا كانت الدولة مرتبطة بمدن أو مستخدمين أو طلبات.",
      confirmLabel: "حذف",
      danger: true,
    });
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteCountryAction(country.id);
      if (!result.success) {
        showToast(result.error ?? "تعذر حذف الدولة.", "error");
        return;
      }
      showToast("تم حذف الدولة بنجاح.", "success");
      router.refresh();
    });
  }

  const columns: DataTableColumn<AdminCountryListItem>[] = [
    {
      key: "name",
      header: "الدولة",
      render: (c) => (
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 flex-shrink-0 text-teal-600" />
          <div>
            <p className="font-bold text-navy-950">{c.nameAr}</p>
            <p className="text-xs text-text-400">
              {c.nameEn} · <span dir="ltr">{c.code}</span>
            </p>
          </div>
        </div>
      ),
    },
    { key: "currency", header: "العملات", render: (c) => (c.currencyCodes.length ? c.currencyCodes.join(", ") : "—") },
    { key: "cities", header: "عدد المدن", render: (c) => c.cityCount.toLocaleString("ar") },
    { key: "default", header: "الافتراضية", render: (c) => (c.isDefault ? <Badge tone="info">افتراضية</Badge> : "—") },
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
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-text-500">إضافة دولة جديدة لا تحتاج أي تعديل برمجي — متصلة مباشرة بقاعدة البيانات.</p>
        <Button onClick={openCreateForm}>
          <Plus className="h-4 w-4" /> إضافة دولة
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-card border border-border bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-navy-950">{editingId ? "تعديل الدولة" : "دولة جديدة"}</h3>
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
                <FormField label={locale === "ar" ? "اسم الدولة (عربي)" : "Country name (English)"}>
                  <Input
                    placeholder={locale === "ar" ? "المملكة العربية السعودية" : "Saudi Arabia"}
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
              <FormField label="رمز الدولة (ISO)" hint="حرفان أو ثلاثة أحرف إنجليزية كبيرة، مثل SA">
                <Input
                  placeholder="SA"
                  dir="ltr"
                  value={formValues.code}
                  onChange={(e) => setFormValues((v) => ({ ...v, code: e.target.value }))}
                />
              </FormField>
              <FormField label="مفتاح الاتصال الدولي (اختياري)">
                <Input
                  placeholder="+966"
                  dir="ltr"
                  value={formValues.phoneDialCode}
                  onChange={(e) => setFormValues((v) => ({ ...v, phoneDialCode: e.target.value }))}
                />
              </FormField>
              <Toggle
                checked={formValues.isActive}
                onChange={(value) => setFormValues((v) => ({ ...v, isActive: value }))}
                label="مفعّلة"
              />
              <Toggle
                checked={formValues.isDefault}
                onChange={(value) => setFormValues((v) => ({ ...v, isDefault: value }))}
                label="الدولة الافتراضية للمنصة"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={closeForm} disabled={isPending}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "جارٍ الحفظ..." : "حفظ الدولة"}
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
        searchPlaceholder="بحث عن دولة..."
        page={page}
        pageSize={PAGE_SIZE}
        totalItems={filtered.length}
        onPageChange={setPage}
        emptyTitle="لا توجد دول مضافة"
        emptyDescription="ابدأ بإضافة أول دولة مدعومة على المنصة."
      />
    </div>
  );
}
