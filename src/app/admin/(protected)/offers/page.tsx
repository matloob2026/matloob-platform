"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { listOffersMock, type AdminOfferRow } from "@/services/mock/offers.mock";
import type { OfferStatus } from "@/types/domain";

const STATUS_LABEL: Record<OfferStatus, string> = {
  PENDING: "قيد الانتظار",
  ACCEPTED: "مقبول",
  REJECTED: "مرفوض",
  WITHDRAWN: "مسحوب",
  EXPIRED: "منتهي",
};
const STATUS_TONE: Record<OfferStatus, "success" | "warning" | "danger" | "neutral"> = {
  PENDING: "warning",
  ACCEPTED: "success",
  REJECTED: "danger",
  WITHDRAWN: "neutral",
  EXPIRED: "neutral",
};

const PAGE_SIZE = 8;

export default function AdminOffersPage() {
  const [rows, setRows] = useState<AdminOfferRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OfferStatus | "">("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    listOffersMock({ search, status: status || undefined, page, pageSize: PAGE_SIZE }).then(
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

  const columns: DataTableColumn<AdminOfferRow>[] = [
    { key: "request", header: "الطلب", render: (o) => o.requestTitle },
    { key: "supplier", header: "المورد", render: (o) => o.supplier },
    { key: "price", header: "السعر المعروض", render: (o) => o.price ?? "حسب الاتفاق" },
    {
      key: "status",
      header: "الحالة",
      render: (o) => <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>,
    },
    {
      key: "createdAt",
      header: "تاريخ التقديم",
      render: (o) => new Date(o.createdAt).toLocaleDateString("ar-SA"),
    },
  ];

  return (
    <div>
      <PageHeader title="العروض" description="متابعة العروض المقدمة من الموردين على الطلبات" />

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(o) => o.id}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="بحث باسم المورد أو الطلب..."
        filters={
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as OfferStatus | "");
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
        emptyTitle="لا توجد عروض"
        emptyDescription="لم يتم العثور على عروض تطابق معايير البحث الحالية."
      />
    </div>
  );
}
