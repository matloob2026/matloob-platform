"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, FormField, Toggle } from "@/components/ui/Field";
import { TranslationTabs } from "@/components/admin/TranslationTabs";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import type { HomepageStatListItem } from "@/services/homepage-content.service";
import {
  createHomepageStatAction,
  updateHomepageStatAction,
  setHomepageStatActiveAction,
  deleteHomepageStatAction,
} from "./actions";

interface FormValues {
  key: string;
  value: string;
  labelAr: string;
  labelEn: string;
  isActive: boolean;
}

const EMPTY_FORM: FormValues = { key: "", value: "", labelAr: "", labelEn: "", isActive: true };

function toFormValues(stat: HomepageStatListItem): FormValues {
  return {
    key: stat.key,
    value: String(stat.value),
    labelAr: stat.labelAr,
    labelEn: stat.labelEn,
    isActive: stat.isActive,
  };
}

/** Real, database-backed Homepage Statistics management — Checkpoint 02.
 * Reuses the existing HomepageStat/HomepageStatTranslation model and the
 * same DataTable/TranslationTabs pattern Categories used in Checkpoint 01. */
export function HomepageStatsManager({ initialStats }: { initialStats: HomepageStatListItem[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<FormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | undefined>();

  const rows = useMemo(() => initialStats, [initialStats]);

  function openCreateForm() {
    setEditingId(null);
    setFormValues(EMPTY_FORM);
    setFormError(undefined);
    setShowForm(true);
  }

  function openEditForm(stat: HomepageStatListItem) {
    setEditingId(stat.id);
    setFormValues(toFormValues(stat));
    setFormError(undefined);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setFormError(undefined);
  }

  function handleSave() {
    setFormError(undefined);
    const numericValue = Number(formValues.value);
    startTransition(async () => {
      const input = {
        key: formValues.key.trim(),
        value: numericValue,
        labelAr: formValues.labelAr.trim(),
        labelEn: formValues.labelEn.trim(),
        isActive: formValues.isActive,
      };

      const result = editingId
        ? await updateHomepageStatAction(editingId, input)
        : await createHomepageStatAction(input);

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      showToast(editingId ? "تم تحديث الإحصائية بنجاح." : "تم إضافة الإحصائية بنجاح.", "success");
      setShowForm(false);
      router.refresh();
    });
  }

  function handleToggleActive(stat: HomepageStatListItem) {
    startTransition(async () => {
      const result = await setHomepageStatActiveAction(stat.id, !stat.isActive);
      if (!result.success) {
        showToast(result.error ?? "تعذر تحديث حالة الإحصائية.", "error");
        return;
      }
      showToast(!stat.isActive ? "تم تفعيل الإحصائية." : "تم تعطيل الإحصائية.", "success");
      router.refresh();
    });
  }

  async function handleDelete(stat: HomepageStatListItem) {
    const confirmed = await confirm({
      title: `حذف "${stat.labelAr}"؟`,
      message: "لا يمكن التراجع عن هذا الإجراء.",
      confirmLabel: "حذف",
      danger: true,
    });
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteHomepageStatAction(stat.id);
      if (!result.success) {
        showToast(result.error ?? "تعذر حذف الإحصائية.", "error");
        return;
      }
      showToast("تم حذف الإحصائية بنجاح.", "success");
      router.refresh();
    });
  }

  const columns: DataTableColumn<HomepageStatListItem>[] = [
    {
      key: "label",
      header: "الإحصائية",
      render: (s) => (
        <div>
          <p className="font-bold text-navy-950">{s.labelAr}</p>
          <p className="text-xs text-text-400">{s.labelEn}</p>
        </div>
      ),
    },
    { key: "value", header: "القيمة", render: (s) => <span dir="ltr">{s.value.toLocaleString("en-US")}</span> },
    { key: "key", header: "المفتاح", render: (s) => <code className="text-xs" dir="ltr">{s.key}</code> },
    {
      key: "status",
      header: "الحالة",
      render: (s) => (
        <button onClick={() => handleToggleActive(s)} disabled={isPending} className="disabled:opacity-50">
          <Badge tone={s.isActive ? "success" : "neutral"}>{s.isActive ? "مفعّل" : "معطّل"}</Badge>
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (s) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEditForm(s)}
            className="rounded-lg p-2 text-text-400 transition hover:bg-surface-muted hover:text-teal-600"
            aria-label="تعديل"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(s)}
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
        <h3 className="font-display text-lg font-bold text-navy-950">إحصائيات الصفحة الرئيسية</h3>
        <Button size="sm" onClick={openCreateForm}>
          <Plus className="h-4 w-4" /> إضافة إحصائية
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-card border border-border bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-display text-base font-bold text-navy-950">
              {editingId ? "تعديل الإحصائية" : "إحصائية جديدة"}
            </h4>
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
                <FormField label={locale === "ar" ? "التسمية (عربي)" : "Label (English)"}>
                  <Input
                    placeholder={locale === "ar" ? "طلب منشور" : "Requests Published"}
                    value={locale === "ar" ? formValues.labelAr : formValues.labelEn}
                    onChange={(e) =>
                      setFormValues((v) =>
                        locale === "ar" ? { ...v, labelAr: e.target.value } : { ...v, labelEn: e.target.value }
                      )
                    }
                  />
                </FormField>
              )}
            />
            <div className="space-y-4">
              <FormField label="القيمة">
                <Input
                  type="number"
                  dir="ltr"
                  value={formValues.value}
                  onChange={(e) => setFormValues((v) => ({ ...v, value: e.target.value }))}
                />
              </FormField>
              <FormField label="المفتاح (Key)" hint="أحرف إنجليزية صغيرة وأرقام وشرطات سفلية فقط">
                <Input
                  placeholder="requests_published"
                  dir="ltr"
                  value={formValues.key}
                  onChange={(e) => setFormValues((v) => ({ ...v, key: e.target.value }))}
                  disabled={Boolean(editingId)}
                />
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
              {isPending ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(s) => s.id}
        page={1}
        pageSize={Math.max(rows.length, 1)}
        totalItems={rows.length}
        onPageChange={() => {}}
        emptyTitle="لا توجد إحصائيات"
        emptyDescription="ابدأ بإضافة أول إحصائية تظهر في الصفحة الرئيسية."
      />
    </div>
  );
}
