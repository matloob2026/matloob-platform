"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Coins } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import type { AdminCurrencyListItem } from "@/services/admin/currency.service";
import { createCurrencyAction, updateCurrencyAction, deleteCurrencyAction } from "./actions";

const PAGE_SIZE = 20;

interface FormValues {
  code: string;
  symbol: string;
  decimalDigits: string;
}

const EMPTY_FORM: FormValues = { code: "", symbol: "", decimalDigits: "2" };

function toFormValues(currency: AdminCurrencyListItem): FormValues {
  return { code: currency.code, symbol: currency.symbol, decimalDigits: String(currency.decimalDigits) };
}

/** Real, database-backed Currencies management. Reuses the existing
 * Currency model. No activate/deactivate control — the model has no
 * `isActive` column (see currency.service.ts's docstring); lifecycle
 * here is create/edit/delete only. */
export function CurrenciesManager({ initialCurrencies }: { initialCurrencies: AdminCurrencyListItem[] }) {
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
    if (!q) return initialCurrencies;
    return initialCurrencies.filter((c) => c.code.toLowerCase().includes(q) || c.symbol.includes(search.trim()));
  }, [initialCurrencies, search]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openCreateForm() {
    setEditingId(null);
    setFormValues(EMPTY_FORM);
    setFormError(undefined);
    setShowForm(true);
  }

  function openEditForm(currency: AdminCurrencyListItem) {
    setEditingId(currency.id);
    setFormValues(toFormValues(currency));
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
        symbol: formValues.symbol.trim(),
        decimalDigits: Number(formValues.decimalDigits) || 0,
      };

      const result = editingId ? await updateCurrencyAction(editingId, input) : await createCurrencyAction(input);

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      showToast(editingId ? "تم تحديث العملة بنجاح." : "تم إضافة العملة بنجاح.", "success");
      setShowForm(false);
      router.refresh();
    });
  }

  async function handleDelete(currency: AdminCurrencyListItem) {
    const confirmed = await confirm({
      title: `حذف عملة "${currency.code}"؟`,
      message: "لا يمكن التراجع عن هذا الإجراء. سيتم رفض الحذف تلقائياً إذا كانت العملة مستخدمة في طلبات أو مرتبطة بدول.",
      confirmLabel: "حذف",
      danger: true,
    });
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteCurrencyAction(currency.id);
      if (!result.success) {
        showToast(result.error ?? "تعذر حذف العملة.", "error");
        return;
      }
      showToast("تم حذف العملة بنجاح.", "success");
      router.refresh();
    });
  }

  const columns: DataTableColumn<AdminCurrencyListItem>[] = [
    {
      key: "code",
      header: "العملة",
      render: (c) => (
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 flex-shrink-0 text-teal-600" />
          <div>
            <p className="font-bold text-navy-950" dir="ltr">
              {c.code}
            </p>
            <p className="text-xs text-text-400">{c.symbol}</p>
          </div>
        </div>
      ),
    },
    { key: "decimals", header: "الخانات العشرية", render: (c) => c.decimalDigits },
    { key: "countries", header: "الدول المرتبطة", render: (c) => (c.countryCodes.length ? c.countryCodes.join(", ") : "—") },
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
        <p className="text-sm text-text-500">إضافة عملة جديدة لا تحتاج أي تعديل برمجي — متصلة مباشرة بقاعدة البيانات.</p>
        <Button onClick={openCreateForm}>
          <Plus className="h-4 w-4" /> إضافة عملة
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-card border border-border bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-navy-950">{editingId ? "تعديل العملة" : "عملة جديدة"}</h3>
            <button onClick={closeForm} className="rounded-lg p-1.5 text-text-400 hover:bg-surface-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
              {formError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="رمز العملة (ISO 4217)" hint="ثلاثة أحرف إنجليزية كبيرة، مثل SAR">
              <Input
                placeholder="SAR"
                dir="ltr"
                value={formValues.code}
                onChange={(e) => setFormValues((v) => ({ ...v, code: e.target.value }))}
              />
            </FormField>
            <FormField label="الرمز النصي" hint="مثل ر.س">
              <Input
                placeholder="ر.س"
                value={formValues.symbol}
                onChange={(e) => setFormValues((v) => ({ ...v, symbol: e.target.value }))}
              />
            </FormField>
            <FormField label="الخانات العشرية">
              <Input
                type="number"
                dir="ltr"
                min={0}
                max={4}
                value={formValues.decimalDigits}
                onChange={(e) => setFormValues((v) => ({ ...v, decimalDigits: e.target.value }))}
              />
            </FormField>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={closeForm} disabled={isPending}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "جارٍ الحفظ..." : "حفظ العملة"}
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
        searchPlaceholder="بحث عن عملة..."
        page={page}
        pageSize={PAGE_SIZE}
        totalItems={filtered.length}
        onPageChange={setPage}
        emptyTitle="لا توجد عملات"
        emptyDescription="ابدأ بإضافة أول عملة مدعومة على المنصة."
      />
    </div>
  );
}
