"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { listRequestsMock, type AdminRequestRow } from "@/services/mock/requests.mock";
import type { RequestStatus } from "@/types/domain";

const STATUS_LABEL: Record<RequestStatus, string> = {
  DRAFT: "مسودة",
  PUBLISHED: "منشور",
  IN_PROGRESS: "قيد التنفيذ",
  FULFILLED: "مكتمل",
  EXPIRED: "منتهي",
  CLOSED_BY_BUYER: "أغلقه المشتري",
  REMOVED_BY_ADMIN: "أزاله المدير",
};
const STATUS_TONE: Record<RequestStatus, "success" | "warning" | "danger" | "neutral" | "info"> = {
  DRAFT: "neutral",
  PUBLISHED: "info",
  IN_PROGRESS: "warning",
  FULFILLED: "success",
  EXPIRED: "neutral",
  CLOSED_BY_BUYER: "neutral",
  REMOVED_BY_ADMIN: "danger",
};

const PAGE_SIZE = 8;

export default function AdminRequestsPage() {
  const [rows, setRows] = useState<AdminRequestRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RequestStatus | "">("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    listRequestsMock({ search, status: status || undefined, page, pageSize: PAGE_SIZE }).then(
      (res) => {
        if (cancelled) return;
        setRows(res.items);
        setTotalItems(res.totalItems);
        setIsLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [search, status, page]);

  const columns: DataTableColumn<AdminRequestRow>[] = [
    {
      key: "title",
      header: "الطلب",
      render: (r) => (
        <div>
          <p className="font-bold text-navy-950">{r.title}</p>
          <p className="text-xs text-text-400">{r.category} · {r.city}</p>
        </div>
      ),
    },
    { key: "owner", header: "صاحب الطلب", render: (r) => r.owner },
    { key: "budget", header: "الميزانية", render: (r) => r.budget ?? "غير محددة" },
    { key: "offers", header: "العروض", render: (r) => r.offerCount },
    {
      key: "status",
      header: "الحالة",
      render: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>,
    },
    {
      key: "createdAt",
      header: "تاريخ النشر",
      render: (r) => new Date(r.createdAt).toLocaleDateString("ar-SA"),
    },
  ];

  return (
    <div>
      <PageHeader title="الطلبات" description="مراجعة وإدارة كل الطلبات المنشورة على المنصة" />

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="بحث بعنوان الطلب..."
        filters={
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as RequestStatus | "");
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
        }
        page={page}
        pageSize={PAGE_SIZE}
        totalItems={totalItems}
        onPageChange={setPage}
        emptyTitle="لا توجد طلبات"
        emptyDescription="لم يتم العثور على طلبات تطابق معايير البحث الحالية."
      />
    </div>
  );
}
