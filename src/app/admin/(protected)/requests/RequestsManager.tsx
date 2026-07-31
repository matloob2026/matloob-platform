"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  FileEdit,
  XCircle,
  Ban,
  Trash2,
  Star,
  Flag,
  Hourglass,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { StatCard } from "@/components/admin/StatCard";
import { Select } from "@/components/ui/Field";
import { RequestStatusBadge } from "@/components/requests/RequestStatusBadge";
import { STATUS_LABEL } from "@/components/requests/RequestStatusBadge";
import type {
  AdminRequestListItem,
  ListRequestsResult,
  RequestDashboardCounts,
  AdminRequestStatus,
} from "@/services/admin/request-admin.service";
import type { AdminCategoryListItem } from "@/services/admin/category.service";
import type { AdminCountryListItem } from "@/services/admin/country.service";
import type { AdminCityListItem } from "@/services/admin/city.service";
import { listRequestsAction } from "./actions";

const PAGE_SIZE = 20;

type SortOption = { sortBy: "createdAt" | "updatedAt" | "offerCount" | "title"; sortDir: "asc" | "desc" };
const SORT_OPTIONS: { key: string; label: string; value: SortOption }[] = [
  { key: "created_desc", label: "الأحدث أولاً", value: { sortBy: "createdAt", sortDir: "desc" } },
  { key: "created_asc", label: "الأقدم أولاً", value: { sortBy: "createdAt", sortDir: "asc" } },
  { key: "updated_desc", label: "آخر تحديث", value: { sortBy: "updatedAt", sortDir: "desc" } },
  { key: "offers_desc", label: "الأكثر عروضاً", value: { sortBy: "offerCount", sortDir: "desc" } },
  { key: "title_asc", label: "العنوان (أ-ي)", value: { sortBy: "title", sortDir: "asc" } },
];

/** Requests Administration Module — the operational core. Reuses the
 * existing DataTable/StatCard/RequestStatusBadge/Select components; no
 * parallel table/KPI/badge system. Server-side pagination/filtering/
 * sorting throughout (see src/services/admin/request-admin.service.ts) —
 * never loads the full table into the browser to filter client-side. */
export function RequestsManager({
  counts,
  initialResult,
  categories,
  countries,
  cities,
}: {
  counts: RequestDashboardCounts;
  initialResult: ListRequestsResult;
  categories: AdminCategoryListItem[];
  countries: AdminCountryListItem[];
  cities: AdminCityListItem[];
}) {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<ListRequestsResult>(initialResult);
  const [isLoading, setIsLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AdminRequestStatus | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [countryId, setCountryId] = useState("");
  const [cityId, setCityId] = useState("");
  const [ownerId, setOwnerId] = useState(searchParams.get("ownerId") ?? "");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [hasReports, setHasReports] = useState(false);
  const [hasOffers, setHasOffers] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState(SORT_OPTIONS[0]!.key);
  const [page, setPage] = useState(1);

  const citiesForCountry = countryId ? cities.filter((c) => c.countryId === countryId) : cities;
  const sort = SORT_OPTIONS.find((s) => s.key === sortKey)?.value ?? SORT_OPTIONS[0]!.value;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    listRequestsAction({
      search: search || undefined,
      status: status || undefined,
      categoryId: categoryId || undefined,
      countryId: countryId || undefined,
      cityId: cityId || undefined,
      ownerId: ownerId || undefined,
      isFeatured: featuredOnly || undefined,
      hasReports: hasReports || undefined,
      hasOffers: hasOffers || undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      sortBy: sort.sortBy,
      sortDir: sort.sortDir,
      page,
      pageSize: PAGE_SIZE,
    }).then((res) => {
      if (cancelled) return;
      setResult(res);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, categoryId, countryId, cityId, ownerId, featuredOnly, hasReports, hasOffers, dateFrom, dateTo, sortKey, page]);

  function resetToFirstPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  const columns: DataTableColumn<AdminRequestListItem>[] = [
    {
      key: "id",
      header: "المعرّف",
      render: (r) => (
        <Link href={`/admin/requests/${r.id}`} className="font-mono text-xs text-teal-600 hover:underline" dir="ltr">
          {r.id.slice(0, 8)}
        </Link>
      ),
    },
    {
      key: "title",
      header: "العنوان",
      render: (r) => (
        <Link href={`/admin/requests/${r.id}`} className="font-bold text-navy-950 hover:text-teal-600">
          {r.title.length > 40 ? `${r.title.slice(0, 40)}…` : r.title}
        </Link>
      ),
    },
    { key: "category", header: "التصنيف", render: (r) => r.categoryName },
    { key: "city", header: "المدينة", render: (r) => r.cityName ?? "—" },
    {
      key: "user",
      header: "المستخدم",
      render: (r) => (
        <div>
          <p className="text-sm font-semibold text-navy-950">{r.ownerName}</p>
          {r.ownerEmail && <p className="text-xs text-text-400" dir="ltr">{r.ownerEmail}</p>}
        </div>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (r) => (
        <div className="flex items-center gap-1">
          <RequestStatusBadge status={r.status} />
          {r.isFeatured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
        </div>
      ),
    },
    {
      key: "offers",
      header: "العروض",
      render: (r) => (
        <Link href={`/admin/offers?requestId=${r.id}`} className="text-sm text-teal-600 hover:underline">
          {r.offerCount.toLocaleString("ar")}
        </Link>
      ),
    },
    {
      key: "reports",
      header: "البلاغات",
      render: (r) =>
        r.reportCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-sm font-bold text-red-600">
            <Flag className="h-3.5 w-3.5" /> {r.reportCount.toLocaleString("ar")}
          </span>
        ) : (
          <span className="text-sm text-text-400">0</span>
        ),
    },
    { key: "createdAt", header: "تاريخ الإنشاء", render: (r) => new Date(r.createdAt).toLocaleDateString("ar-SA") },
    { key: "updatedAt", header: "آخر تحديث", render: (r) => new Date(r.updatedAt).toLocaleDateString("ar-SA") },
  ];

  return (
    <div>
      <PageHeader title="إدارة الطلبات" description="المركز التشغيلي لكل طلبات المستخدمين على المنصة" />

      {ownerId && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm">
          <span className="font-semibold text-teal-800">تعرض حالياً طلبات مستخدم واحد فقط.</span>
          <button
            onClick={() => {
              setOwnerId("");
              setPage(1);
            }}
            className="font-bold text-teal-700 hover:underline"
          >
            عرض كل الطلبات
          </button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="إجمالي الطلبات" value={counts.total.toLocaleString("ar")} icon={ClipboardList} />
        <StatCard label="منشور" value={counts.published.toLocaleString("ar")} icon={CheckCircle2} />
        <StatCard label="بانتظار المراجعة" value={counts.pendingReview.toLocaleString("ar")} icon={Hourglass} />
        <StatCard label="مسودة" value={counts.draft.toLocaleString("ar")} icon={FileEdit} />
        <StatCard label="مغلق" value={counts.closed.toLocaleString("ar")} icon={Ban} />
        <StatCard label="مرفوض" value={counts.rejected.toLocaleString("ar")} icon={XCircle} />
        <StatCard label="محذوف" value={counts.deleted.toLocaleString("ar")} icon={Trash2} />
        <StatCard label="مميز" value={counts.featured.toLocaleString("ar")} icon={Star} />
        <StatCard label="عليه بلاغات" value={counts.reported.toLocaleString("ar")} icon={Flag} />
        <StatCard label="منتهي" value={counts.expired.toLocaleString("ar")} icon={Clock} />
      </div>

      <DataTable
        columns={columns}
        rows={result.items}
        getRowId={(r) => r.id}
        isLoading={isLoading}
        searchValue={search}
        onSearchChange={resetToFirstPage(setSearch)}
        searchPlaceholder="بحث بالعنوان أو الوصف أو المعرّف..."
        filters={
          <>
            <Select value={status} onChange={(e) => resetToFirstPage(setStatus)(e.target.value as AdminRequestStatus | "")} className="w-auto">
              <option value="">كل الحالات</option>
              {Object.entries(STATUS_LABEL).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
            <Select value={categoryId} onChange={(e) => resetToFirstPage(setCategoryId)(e.target.value)} className="w-auto">
              <option value="">كل التصنيفات</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </Select>
            <Select
              value={countryId}
              onChange={(e) => {
                resetToFirstPage(setCountryId)(e.target.value);
                setCityId("");
              }}
              className="w-auto"
            >
              <option value="">كل الدول</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </Select>
            <Select value={cityId} onChange={(e) => resetToFirstPage(setCityId)(e.target.value)} className="w-auto">
              <option value="">كل المدن</option>
              {citiesForCountry.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </Select>
            <Select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className="w-auto">
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => resetToFirstPage(setDateFrom)(e.target.value)}
              className="rounded-lg border border-border-strong px-2 py-1.5 text-xs"
              aria-label="من تاريخ"
              dir="ltr"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => resetToFirstPage(setDateTo)(e.target.value)}
              className="rounded-lg border border-border-strong px-2 py-1.5 text-xs"
              aria-label="إلى تاريخ"
              dir="ltr"
            />
            <label className="flex items-center gap-1.5 text-xs font-semibold text-text-500">
              <input
                type="checkbox"
                checked={featuredOnly}
                onChange={(e) => resetToFirstPage(setFeaturedOnly)(e.target.checked)}
                className="h-4 w-4 rounded border-border-strong text-teal-600 focus:ring-teal-500"
              />
              مميز فقط
            </label>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-text-500">
              <input
                type="checkbox"
                checked={hasReports}
                onChange={(e) => resetToFirstPage(setHasReports)(e.target.checked)}
                className="h-4 w-4 rounded border-border-strong text-teal-600 focus:ring-teal-500"
              />
              عليه بلاغات
            </label>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-text-500">
              <input
                type="checkbox"
                checked={hasOffers}
                onChange={(e) => resetToFirstPage(setHasOffers)(e.target.checked)}
                className="h-4 w-4 rounded border-border-strong text-teal-600 focus:ring-teal-500"
              />
              لديه عروض
            </label>
          </>
        }
        page={result.page}
        pageSize={result.pageSize}
        totalItems={result.total}
        onPageChange={setPage}
        emptyTitle="لا توجد طلبات"
        emptyDescription="لم يتم العثور على طلبات تطابق معايير البحث الحالية."
      />
    </div>
  );
}
