"use client";

import { useEffect, useState } from "react";
import { Plus, Globe2 } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Tabs } from "@/components/admin/Tabs";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Field";
import {
  listCountriesMock,
  listCitiesMock,
  type AdminCountryRow,
  type AdminCityRow,
} from "@/services/mock/localization.mock";

function CountriesTab() {
  const [rows, setRows] = useState<AdminCountryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listCountriesMock().then((data) => {
      setRows(data);
      setIsLoading(false);
    });
  }, []);

  const columns: DataTableColumn<AdminCountryRow>[] = [
    {
      key: "name",
      header: "الدولة",
      render: (c) => (
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-teal-600" />
          <div>
            <p className="font-bold text-navy-950">{c.nameAr}</p>
            <p className="text-xs text-text-400">{c.nameEn} · {c.code}</p>
          </div>
        </div>
      ),
    },
    { key: "currency", header: "العملة", render: (c) => c.currency },
    { key: "cities", header: "عدد المدن", render: (c) => c.cityCount },
    {
      key: "default",
      header: "الافتراضية",
      render: (c) => (c.isDefault ? <Badge tone="info">افتراضية</Badge> : "—"),
    },
    {
      key: "active",
      header: "الحالة",
      render: (c) => <Toggle checked={c.isActive} onChange={() => {}} label={c.isActive ? "مفعّلة" : "معطّلة"} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowId={(c) => c.id}
      isLoading={isLoading}
      page={1}
      pageSize={20}
      totalItems={rows.length}
      onPageChange={() => {}}
      emptyTitle="لا توجد دول مضافة"
    />
  );
}

function CitiesTab() {
  const [rows, setRows] = useState<AdminCityRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listCitiesMock().then((data) => {
      setRows(data);
      setIsLoading(false);
    });
  }, []);

  const filtered = rows.filter((c) => c.nameAr.includes(search));

  const columns: DataTableColumn<AdminCityRow>[] = [
    { key: "name", header: "المدينة", render: (c) => (
      <div>
        <p className="font-bold text-navy-950">{c.nameAr}</p>
        <p className="text-xs text-text-400">{c.nameEn}</p>
      </div>
    ) },
    { key: "country", header: "الدولة", render: (c) => c.countryId.replace("country-", "").toUpperCase() },
    {
      key: "active",
      header: "الحالة",
      render: (c) => <Badge tone={c.isActive ? "success" : "neutral"}>{c.isActive ? "مفعّلة" : "معطّلة"}</Badge>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={filtered}
      getRowId={(c) => c.id}
      isLoading={isLoading}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="بحث عن مدينة..."
      page={1}
      pageSize={20}
      totalItems={filtered.length}
      onPageChange={() => {}}
      emptyTitle="لا توجد مدن"
    />
  );
}

export default function AdminLocalizationPage() {
  return (
    <div>
      <PageHeader
        title="المدن والدول"
        description="إدارة الأسواق المدعومة على المنصة — إضافة دولة جديدة (مثل مصر) لا يحتاج أي تعديل برمجي"
        actions={
          <Button>
            <Plus className="h-4 w-4" /> إضافة دولة
          </Button>
        }
      />
      <Tabs
        items={[
          { key: "countries", label: "الدول", content: <CountriesTab /> },
          { key: "cities", label: "المدن", content: <CitiesTab /> },
        ]}
      />
    </div>
  );
}
