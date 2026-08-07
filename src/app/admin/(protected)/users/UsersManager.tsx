"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, Unlock, Monitor, X } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import type {
  AdminUserListItem,
  AdminUserSession,
  UserRoleValue,
  UserStatusValue,
} from "@/services/admin/admin-user.service";
import type { AdminRoleListItem } from "@/services/admin/admin-role.service";
import {
  setUserRoleAction,
  setUserStatusAction,
  sendPasswordResetAction,
  listUserSessionsAction,
  revokeUserSessionAction,
} from "./actions";
import { assignRoleToUserAction } from "../roles/actions";

const PAGE_SIZE = 8;

const ROLE_LABEL: Record<UserRoleValue, string> = {
  BUYER: "مشتري",
  SUPPLIER: "مقدم خدمة",
  BOTH: "مشتري ومقدم خدمة",
  ADMIN: "مدير",
  MODERATOR: "مشرف",
};

const STATUS_TONE: Record<UserStatusValue, "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  PENDING_VERIFICATION: "warning",
  SUSPENDED: "danger",
  BANNED: "danger",
};
const STATUS_LABEL: Record<UserStatusValue, string> = {
  ACTIVE: "نشط",
  PENDING_VERIFICATION: "بانتظار التحقق",
  SUSPENDED: "موقوف (مقفل)",
  BANNED: "محظور",
};

/** Real, database-backed Admin Users management — Administration
 * module. Reuses the existing User/UserProfile model, the existing
 * AuthService.requestPasswordReset flow, and the existing Session
 * model (via src/auth/session.ts) for login session management — no
 * parallel systems. */
export function UsersManager({
  initialUsers,
  availableRoles,
  currentUserId,
}: {
  initialUsers: AdminUserListItem[];
  availableRoles: AdminRoleListItem[];
  currentUserId: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRoleValue | "">("");
  const [statusFilter, setStatusFilter] = useState<UserStatusValue | "">("");
  const [page, setPage] = useState(1);

  const [sessionsFor, setSessionsFor] = useState<AdminUserListItem | null>(null);
  const [sessions, setSessions] = useState<AdminUserSession[] | null>(null);

  const filtered = useMemo(() => {
    let items = initialUsers;
    if (roleFilter) items = items.filter((u) => u.role === roleFilter);
    if (statusFilter) items = items.filter((u) => u.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (u) =>
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.phone ?? "").toLowerCase().includes(q) ||
          (u.displayName ?? "").toLowerCase().includes(q)
      );
    }
    return items;
  }, [initialUsers, search, roleFilter, statusFilter]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleRoleChange(user: AdminUserListItem, role: UserRoleValue) {
    startTransition(async () => {
      const result = await setUserRoleAction(user.id, role);
      if (!result.success) {
        showToast(result.error ?? "تعذر تغيير الدور.", "error");
        return;
      }
      showToast("تم تحديث دور المستخدم بنجاح.", "success");
      router.refresh();
    });
  }

  function handleAssignRole(user: AdminUserListItem, roleId: string) {
    startTransition(async () => {
      const result = await assignRoleToUserAction(user.id, roleId || null);
      if (!result.success) {
        showToast(result.error ?? "تعذر تعيين الدور المخصص.", "error");
        return;
      }
      showToast(roleId ? "تم تعيين الدور المخصص." : "تمت إزالة الدور المخصص.", "success");
      router.refresh();
    });
  }

  async function handleToggleLock(user: AdminUserListItem) {
    const locking = user.status !== "SUSPENDED";
    if (locking) {
      const confirmed = await confirm({
        title: `قفل حساب "${user.displayName ?? user.email}"؟`,
        message: "سيتم تسجيل خروجه من كل الجلسات النشطة فوراً ولن يستطيع الدخول حتى يُفتح الحساب مجدداً.",
        confirmLabel: "قفل الحساب",
        danger: true,
      });
      if (!confirmed) return;
    }

    startTransition(async () => {
      const result = await setUserStatusAction(user.id, locking ? "SUSPENDED" : "ACTIVE");
      if (!result.success) {
        showToast(result.error ?? "تعذر تحديث حالة الحساب.", "error");
        return;
      }
      showToast(locking ? "تم قفل الحساب." : "تم فتح الحساب.", "success");
      router.refresh();
    });
  }

  async function handlePasswordReset(user: AdminUserListItem) {
    const confirmed = await confirm({
      title: "إرسال رابط إعادة تعيين كلمة المرور؟",
      message: `سيصل بريد إلكتروني إلى ${user.email ?? "هذا المستخدم"} يحتوي على رابط لإعادة تعيين كلمة المرور.`,
      confirmLabel: "إرسال",
    });
    if (!confirmed) return;

    startTransition(async () => {
      const result = await sendPasswordResetAction(user.id);
      if (!result.success) {
        showToast(result.error ?? "تعذر إرسال رابط إعادة التعيين.", "error");
        return;
      }
      showToast("تم إرسال رابط إعادة تعيين كلمة المرور.", "success");
    });
  }

  function openSessions(user: AdminUserListItem) {
    setSessionsFor(user);
    setSessions(null);
    listUserSessionsAction(user.id).then(setSessions);
  }

  function handleRevokeSession(sessionId: string) {
    if (!sessionsFor) return;
    startTransition(async () => {
      const result = await revokeUserSessionAction(sessionId, sessionsFor.id);
      if (!result.success) {
        showToast(result.error ?? "تعذر إنهاء الجلسة.", "error");
        return;
      }
      showToast("تم إنهاء الجلسة.", "success");
      setSessions((prev) => prev?.filter((s) => s.id !== sessionId) ?? null);
    });
  }

  const columns: DataTableColumn<AdminUserListItem>[] = [
    {
      key: "name",
      header: "المستخدم",
      render: (u) => (
        <div>
          <p className="font-bold text-navy-950">{u.displayName ?? "—"}</p>
          <p className="text-xs text-text-400">{u.email ?? u.phone ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "الدور",
      render: (u) => (
        <Select
          value={u.role}
          disabled={isPending || u.id === currentUserId}
          onChange={(e) => handleRoleChange(u, e.target.value as UserRoleValue)}
          className="w-auto text-xs"
        >
          {Object.entries(ROLE_LABEL).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      ),
    },
    {
      key: "customRole",
      header: "دور مخصص",
      render: (u) =>
        u.role === "MODERATOR" ? (
          <Select
            value={u.customRoleId ?? ""}
            disabled={isPending}
            onChange={(e) => handleAssignRole(u, e.target.value)}
            className="w-auto text-xs"
          >
            <option value="">الصلاحيات الافتراضية فقط</option>
            {availableRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        ) : (
          <span className="text-xs text-text-400">—</span>
        ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (u) => <Badge tone={STATUS_TONE[u.status]}>{STATUS_LABEL[u.status]}</Badge>,
    },
    {
      key: "lastLogin",
      header: "آخر دخول",
      render: (u) => (u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("ar-SA") : "—"),
    },
    {
      key: "createdAt",
      header: "تاريخ التسجيل",
      render: (u) => new Date(u.createdAt).toLocaleDateString("ar-SA"),
    },
    {
      key: "actions",
      header: "",
      render: (u) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openSessions(u)}
            className="rounded-lg p-2 text-text-400 transition hover:bg-surface-muted hover:text-teal-600"
            aria-label="جلسات الدخول"
            title="جلسات الدخول"
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            onClick={() => handlePasswordReset(u)}
            disabled={isPending || !u.email}
            className="rounded-lg p-2 text-text-400 transition hover:bg-surface-muted hover:text-teal-600 disabled:opacity-50"
            aria-label="إعادة تعيين كلمة المرور"
            title="إعادة تعيين كلمة المرور"
          >
            <KeyRound className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleToggleLock(u)}
            disabled={isPending || u.id === currentUserId}
            className="rounded-lg p-2 text-text-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label={u.status === "SUSPENDED" ? "فتح الحساب" : "قفل الحساب"}
            title={u.status === "SUSPENDED" ? "فتح الحساب" : "قفل الحساب"}
          >
            {u.status === "SUSPENDED" ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </button>
        </div>
      ),
      className: "w-32",
    },
  ];

  return (
    <div>
      <PageHeader title="المستخدمون" description="إدارة حسابات المستخدمين، الأدوار، الحالة، وجلسات الدخول" />

      <DataTable
        columns={columns}
        rows={paged}
        getRowId={(u) => u.id}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="بحث بالاسم أو البريد الإلكتروني..."
        filters={
          <>
            <Select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as UserRoleValue | "");
                setPage(1);
              }}
              className="w-auto"
            >
              <option value="">كل الأدوار</option>
              {Object.entries(ROLE_LABEL).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as UserStatusValue | "");
                setPage(1);
              }}
              className="w-auto"
            >
              <option value="">كل الحالات</option>
              {Object.entries(STATUS_LABEL).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </>
        }
        page={page}
        pageSize={PAGE_SIZE}
        totalItems={filtered.length}
        onPageChange={setPage}
        emptyTitle="لا يوجد مستخدمون"
        emptyDescription="لم يتم العثور على مستخدمين يطابقون معايير البحث الحالية."
      />

      {sessionsFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 p-4"
          onClick={() => setSessionsFor(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-card bg-white shadow-card-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-display text-base font-bold text-navy-950">
                جلسات دخول {sessionsFor.displayName ?? sessionsFor.email}
              </h3>
              <button
                onClick={() => setSessionsFor(null)}
                className="rounded-lg p-1.5 text-text-400 hover:bg-surface-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto p-4">
              {sessions === null ? (
                <p className="py-4 text-center text-sm text-text-400">جارٍ التحميل...</p>
              ) : sessions.length === 0 ? (
                <p className="py-4 text-center text-sm text-text-400">لا توجد جلسات دخول نشطة.</p>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-navy-950">{s.ipAddress ?? "عنوان IP غير معروف"}</p>
                      <p className="text-text-400">{s.userAgent ?? "جهاز غير معروف"}</p>
                      <p className="text-text-400">بدأت: {new Date(s.createdAt).toLocaleString("ar-SA")}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleRevokeSession(s.id)} disabled={isPending}>
                      إنهاء
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
