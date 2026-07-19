"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, FormField, Toggle } from "@/components/ui/Field";
import { TranslationTabs } from "@/components/admin/TranslationTabs";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import type { TrustBadgeListItem } from "@/services/homepage-content.service";
import {
  createTrustBadgeAction,
  updateTrustBadgeAction,
  setTrustBadgeActiveAction,
  deleteTrustBadgeAction,
} from "./actions";

interface FormValues {
  labelAr: string;
  labelEn: string;
  isActive: boolean;
}

const EMPTY_FORM: FormValues = { labelAr: "", labelEn: "", isActive: true };

function toFormValues(badge: TrustBadgeListItem): FormValues {
  return { labelAr: badge.labelAr, labelEn: badge.labelEn, isActive: badge.isActive };
}

/** Real, database-backed Homepage Trust Badges management —
 * Checkpoint 02. Reuses the existing TrustBadge/TrustBadgeTranslation
 * model and the same pattern as HomepageStatsManager/CategoriesManager. */
export function TrustBadgesManager({ initialBadges }: { initialBadges: TrustBadgeListItem[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<FormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | undefined>();

  function openCreateForm() {
    setEditingId(null);
    setFormValues(EMPTY_FORM);
    setFormError(undefined);
    setShowForm(true);
  }

  function openEditForm(badge: TrustBadgeListItem) {
    setEditingId(badge.id);
    setFormValues(toFormValues(badge));
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
        labelAr: formValues.labelAr.trim(),
        labelEn: formValues.labelEn.trim(),
        isActive: formValues.isActive,
      };

      const result = editingId
        ? await updateTrustBadgeAction(editingId, input)
        : await createTrustBadgeAction(input);

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      showToast(editingId ? "تم تحديث الشارة بنجاح." : "تم إضافة الشارة بنجاح.", "success");
      setShowForm(false);
      router.refresh();
    });
  }

  function handleToggleActive(badge: TrustBadgeListItem) {
    startTransition(async () => {
      const result = await setTrustBadgeActiveAction(badge.id, !badge.isActive);
      if (!result.success) {
        showToast(result.error ?? "تعذر تحديث حالة الشارة.", "error");
        return;
      }
      showToast(!badge.isActive ? "تم تفعيل الشارة." : "تم تعطيل الشارة.", "success");
      router.refresh();
    });
  }

  async function handleDelete(badge: TrustBadgeListItem) {
    const confirmed = await confirm({
      title: `حذف "${badge.labelAr}"؟`,
      message: "لا يمكن التراجع عن هذا الإجراء.",
      confirmLabel: "حذف",
      danger: true,
    });
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteTrustBadgeAction(badge.id);
      if (!result.success) {
        showToast(result.error ?? "تعذر حذف الشارة.", "error");
        return;
      }
      showToast("تم حذف الشارة بنجاح.", "success");
      router.refresh();
    });
  }

  const columns: DataTableColumn<TrustBadgeListItem>[] = [
    {
      key: "label",
      header: "الشارة",
      render: (b) => (
        <div>
          <p className="font-bold text-navy-950">{b.labelAr}</p>
          <p className="text-xs text-text-400">{b.labelEn}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (b) => (
        <button onClick={() => handleToggleActive(b)} disabled={isPending} className="disabled:opacity-50">
          <Badge tone={b.isActive ? "success" : "neutral"}>{b.isActive ? "مفعّل" : "معطّل"}</Badge>
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (b) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEditForm(b)}
            className="rounded-lg p-2 text-text-400 transition hover:bg-surface-muted hover:text-teal-600"
            aria-label="تعديل"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(b)}
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
        <h3 className="font-display text-lg font-bold text-navy-950">شارات الثقة (Trust Badges)</h3>
        <Button size="sm" onClick={openCreateForm}>
          <Plus className="h-4 w-4" /> إضافة شارة
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-card border border-border bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="font-display text-base font-bold text-navy-950">
              {editingId ? "تعديل الشارة" : "شارة جديدة"}
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
                <FormField label={locale === "ar" ? "نص الشارة (عربي)" : "Label (English)"}>
                  <Input
                    placeholder={locale === "ar" ? "دفع وتواصل آمن" : "Secure payment & contact"}
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
            <div>
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
        rows={initialBadges}
        getRowId={(b) => b.id}
        page={1}
        pageSize={Math.max(initialBadges.length, 1)}
        totalItems={initialBadges.length}
        onPageChange={() => {}}
        emptyTitle="لا توجد شارات ثقة"
        emptyDescription="ابدأ بإضافة أول شارة تظهر في تذييل الصفحة الرئيسية."
      />
    </div>
  );
}
