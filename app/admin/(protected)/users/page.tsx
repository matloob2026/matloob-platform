"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { listUsersMock, type AdminUserRow } from "@/services/mock/users.mock";
import type { UserRole, UserStatus } from "@/types/domain";

const ROLE_LABEL: Record<UserRole, string> = {
  BUYER: "مشتري",
  SUPPLIER: "مورد",
  BOTH: "مشتري ومورد",
  ADMIN: "مدير",
  MODERATOR: "مشرف",
};

const STATUS_TONE: Record<UserStatus, "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  PENDING_VERIFICATION: "warning",
  SUSPENDED: "danger",
  BANNED: "danger",
};
const STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: "نشط",
  PENDING_VERIFICATION: "بانتظار التحقق",
  SUSPENDED: "موقوف",
  BANNED: "محظور",
};

const PAGE_SIZE = 8;

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    listUsersMock({
      search,
      role: role || undefined,
      status: status || undefined,
      page,
      pageSize: PAGE_SIZE,
    }).then((res) => {
      if (cancelled) return;
      setRows(res.items);
      setTotalItems(res.totalItems);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [search, role, status, page]);

  const columns: DataTableColumn<AdminUserRow>[] = [
    {
      key: "name",
      header: "المستخدم",
      render: (u) => (
        <div>
          <p className="font-bold text-navy-950">{u.displayName}</p>
          <p className="text-xs text-text-400">{u.email}</p>
        </div>
      ),
    },
    { key: "role", header: "الدور", render: (u) => ROLE_LABEL[u.role] },
    { key: "city", header: "المدينة", render: (u) => u.city ?? "—" },
    {
      key: "activity",
      header: "النشاط",
      render: (u) => `${u.requestCount} طلب · ${u.offerCount} عرض`,
    },
    {
      key: "status",
      header: "الحالة",
      render: (u) => <Badge tone={STATUS_TONE[u.status]}>{STATUS_LABEL[u.status]}</Badge>,
    },
    {
      key: "createdAt",
      header: "تاريخ التسجيل",
      render: (u) => new Date(u.createdAt).toLocaleDateString("ar-SA"),
    },
  ];

  return (
    <div>
      <PageHeader title="المستخدمون" description="إدارة حسابات المشترين والموردين" />

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(u) => u.id}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="بحث بالاسم أو البريد الإلكتروني..."
        filters={
          <>
            <Select
              value={role}
              onChange={(e) => {
                setRole(e.target.value as UserRole | "");
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
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as UserStatus | "");
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
        totalItems={totalItems}
        onPageChange={setPage}
        emptyTitle="لا يوجد مستخدمون"
        emptyDescription="لم يتم العثور على مستخدمين يطابقون معايير البحث الحالية."
      />
    </div>
  );
}
