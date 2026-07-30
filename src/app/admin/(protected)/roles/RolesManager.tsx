"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { PERMISSION_CATALOG } from "@/auth/permissions";
import type { AdminRoleListItem } from "@/services/admin/admin-role.service";
import { createRoleAction, updateRoleAction, deleteRoleAction } from "./actions";

interface FormValues {
  name: string;
  description: string;
  permissions: string[];
}

const EMPTY_FORM: FormValues = { name: "", description: "", permissions: [] };

function toFormValues(role: AdminRoleListItem): FormValues {
  return { name: role.name, description: role.description ?? "", permissions: role.permissions };
}

/** Administration module: Roles management — an additive layer that
 * lets a MODERATOR-tier account be granted extra specific permissions
 * beyond their hardcoded baseline (see
 * src/services/admin/admin-role.service.ts's docstring). Only
 * permissions from the fixed `PERMISSION_CATALOG` can be assigned —
 * never a free-text value. */
export function RolesManager({ initialRoles }: { initialRoles: AdminRoleListItem[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<FormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  function openCreateForm() {
    setEditingId(null);
    setFormValues(EMPTY_FORM);
    setFormError(undefined);
    setShowForm(true);
  }

  function openEditForm(role: AdminRoleListItem) {
    setEditingId(role.id);
    setFormValues(toFormValues(role));
    setFormError(undefined);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setFormError(undefined);
  }

  function togglePermission(permission: string) {
    setFormValues((v) => ({
      ...v,
      permissions: v.permissions.includes(permission)
        ? v.permissions.filter((p) => p !== permission)
        : [...v.permissions, permission],
    }));
  }

  function handleSave() {
    setFormError(undefined);
    startTransition(async () => {
      const input = {
        name: formValues.name.trim(),
        description: formValues.description.trim() || null,
        permissions: formValues.permissions,
      };

      const result = editingId ? await updateRoleAction(editingId, input) : await createRoleAction(input);

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      showToast(editingId ? "تم تحديث الدور بنجاح." : "تم إضافة الدور بنجاح.", "success");
      setShowForm(false);
      router.refresh();
    });
  }

  async function handleDelete(role: AdminRoleListItem) {
    const confirmed = await confirm({
      title: `حذف دور "${role.name}"؟`,
      message:
        role.userCount > 0
          ? `${role.userCount.toLocaleString("ar")} مستخدم مرتبط بهذا الدور حالياً — سيعودون إلى الصلاحيات الافتراضية لدورهم الأساسي بعد الحذف.`
          : "لا يمكن التراجع عن هذا الإجراء.",
      confirmLabel: "حذف",
      danger: true,
    });
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteRoleAction(role.id);
      if (!result.success) {
        showToast(result.error ?? "تعذر حذف الدور.", "error");
        return;
      }
      showToast("تم حذف الدور بنجاح.", "success");
      router.refresh();
    });
  }

  const columns: DataTableColumn<AdminRoleListItem>[] = [
    {
      key: "name",
      header: "الدور",
      render: (r) => (
        <div>
          <p className="font-bold text-navy-950">{r.name}</p>
          {r.description && <p className="text-xs text-text-400">{r.description}</p>}
        </div>
      ),
    },
    {
      key: "permissions",
      header: "الصلاحيات",
      render: (r) => (
        <span className="text-xs text-text-500">
          {r.permissions.length > 0 ? `${r.permissions.length.toLocaleString("ar")} صلاحية` : "لا توجد صلاحيات إضافية"}
        </span>
      ),
    },
    {
      key: "users",
      header: "المستخدمون",
      render: (r) => <Badge tone={r.userCount > 0 ? "info" : "neutral"}>{r.userCount.toLocaleString("ar")}</Badge>,
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEditForm(r)}
            className="rounded-lg p-2 text-text-400 transition hover:bg-surface-muted hover:text-teal-600"
            aria-label="تعديل"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(r)}
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
        title="الأدوار والصلاحيات"
        description="أدوار مخصصة تمنح المشرفين صلاحيات إضافية محددة بدقة، بدون التأثير على صلاحيات المدير الكاملة"
        actions={
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4" /> دور جديد
          </Button>
        }
      />

      {showForm && (
        <div className="mb-6 rounded-card border border-border bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-navy-950">{editingId ? "تعديل الدور" : "دور جديد"}</h3>
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
            <FormField label="اسم الدور">
              <Input
                placeholder="مثال: مسؤول الدعم الفني"
                value={formValues.name}
                onChange={(e) => setFormValues((v) => ({ ...v, name: e.target.value }))}
              />
            </FormField>
            <FormField label="وصف مختصر (اختياري)">
              <Textarea
                rows={1}
                value={formValues.description}
                onChange={(e) => setFormValues((v) => ({ ...v, description: e.target.value }))}
              />
            </FormField>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm font-bold text-navy-950">الصلاحيات الإضافية الممنوحة لهذا الدور</p>
            <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
              {PERMISSION_CATALOG.map(({ permission, label }) => (
                <label key={permission} className="flex items-center gap-2 text-sm text-text-700">
                  <input
                    type="checkbox"
                    checked={formValues.permissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className="h-4 w-4 rounded border-border-strong text-teal-600 focus:ring-teal-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={closeForm} disabled={isPending}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "جارٍ الحفظ..." : "حفظ الدور"}
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={initialRoles}
        getRowId={(r) => r.id}
        page={page}
        pageSize={PAGE_SIZE}
        totalItems={initialRoles.length}
        onPageChange={setPage}
        emptyTitle="لا توجد أدوار مخصصة"
        emptyDescription="كل المشرفين يستخدمون الصلاحيات الافتراضية حالياً. أضف دوراً لمنح صلاحيات إضافية محددة."
      />
    </div>
  );
}
