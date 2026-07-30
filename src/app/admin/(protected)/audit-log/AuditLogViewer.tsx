"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import type { AuditLogListItem, AuditLogListResult } from "@/services/admin/audit-log.service";
import { listAuditLogsAction } from "./actions";

function actionTone(action: string): "success" | "danger" | "info" | "neutral" {
  if (action.startsWith("CREATE") || action.startsWith("PUBLISH") || action.startsWith("ACTIVATE")) return "success";
  if (action.startsWith("DELETE") || action.startsWith("SUSPEND") || action.startsWith("BAN")) return "danger";
  return "info";
}

function formatJson(value: unknown): string {
  if (value === null || value === undefined) return "—";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Administration module: read-only Audit Log viewer. Reuses the
 * existing DataTable/search/pagination pattern; every row already
 * existed in the database (see src/services/admin/audit-log.service.ts) —
 * this is the first screen to actually display them. */
export function AuditLogViewer({
  initialResult,
  entityTypes,
}: {
  initialResult: AuditLogListResult;
  entityTypes: string[];
}) {
  const [result, setResult] = useState<AuditLogListResult>(initialResult);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    listAuditLogsAction({ search, entityType: entityType || undefined, page }).then((res) => {
      if (cancelled) return;
      setResult(res);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [search, entityType, page]);

  const columns: DataTableColumn<AuditLogListItem>[] = [
    {
      key: "when",
      header: "الوقت",
      render: (log) => new Date(log.createdAt).toLocaleString("ar-SA"),
    },
    {
      key: "actor",
      header: "المستخدم",
      render: (log) => (
        <div>
          <p className="font-bold text-navy-950">{log.actorName}</p>
          {log.actorEmail && <p className="text-xs text-text-400">{log.actorEmail}</p>}
        </div>
      ),
    },
    {
      key: "action",
      header: "الإجراء",
      render: (log) => <Badge tone={actionTone(log.action)}>{log.action}</Badge>,
    },
    {
      key: "entity",
      header: "العنصر",
      render: (log) => (
        <span className="text-xs text-text-500">
          {log.entityType}
          {log.entityId && <span className="text-text-400"> · {log.entityId.slice(0, 8)}</span>}
        </span>
      ),
    },
    {
      key: "changes",
      header: "قبل / بعد",
      render: (log) => (
        <details className="max-w-xs text-xs text-text-500">
          <summary className="cursor-pointer font-semibold text-teal-600">عرض التفاصيل</summary>
          <p className="mt-1 break-all"><span className="font-bold">قبل:</span> {formatJson(log.before)}</p>
          <p className="mt-1 break-all"><span className="font-bold">بعد:</span> {formatJson(log.after)}</p>
        </details>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="سجل التدقيق" description="سجل كامل لكل تغيير تم إجراؤه من لوحة التحكم، من قام به، ومتى" />

      <DataTable
        columns={columns}
        rows={result.items}
        getRowId={(log) => log.id}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="بحث بالإجراء أو معرّف العنصر أو البريد الإلكتروني..."
        filters={
          <Select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className="w-auto"
          >
            <option value="">كل الأنواع</option>
            {entityTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        }
        page={result.page}
        pageSize={result.pageSize}
        totalItems={result.total}
        onPageChange={setPage}
        emptyTitle="لا توجد سجلات"
        emptyDescription="لم يتم العثور على سجلات تدقيق تطابق معايير البحث الحالية."
      />
    </div>
  );
}
