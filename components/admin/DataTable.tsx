"use client";

import { Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "./EmptyState";
import { TableSkeleton } from "./Skeleton";
import { Pagination } from "./Pagination";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  isLoading?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Slot for page-specific filter controls (selects, date range, etc.) */
  filters?: React.ReactNode;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
}

/**
 * The single table component every admin list page (Users, Requests,
 * Offers, Categories, Cities...) is built on. Column definitions and
 * data differ per page; search/filter/pagination/empty/loading behavior
 * does not — implementing it once here means every list page gets
 * consistent, tested UX for free.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  isLoading,
  searchValue,
  onSearchChange,
  searchPlaceholder = "بحث...",
  filters,
  page,
  pageSize,
  totalItems,
  onPageChange,
  emptyTitle = "لا توجد نتائج",
  emptyDescription = "لم يتم العثور على أي عناصر تطابق معايير البحث الحالية.",
  onRowClick,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <Card padded={false}>
      {(onSearchChange || filters) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          {onSearchChange && (
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-400" />
              <input
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-border-strong py-2 pr-9 pl-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>
          )}
          {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
        </div>
      )}

      {isLoading ? (
        <TableSkeleton columns={columns.length} />
      ) : rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="admin-scroll overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/60">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="whitespace-nowrap px-4 py-3 font-bold text-text-500"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={getRowId(row)}
                  onClick={() => onRowClick?.(row)}
                  className={
                    "border-b border-border last:border-0 " +
                    (onRowClick
                      ? "cursor-pointer transition-colors duration-200 hover:bg-teal-50/40"
                      : "transition-colors duration-200 hover:bg-surface-muted/60")
                  }
                >
                  {columns.map((col) => (
                    <td key={col.key} className={"px-4 py-3.5 text-text-700 " + (col.className ?? "")}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </Card>
  );
}
