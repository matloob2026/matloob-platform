import { Coins } from "lucide-react";
import { requirePermission } from "@/auth/guards";
import { CmsPlaceholder } from "@/components/admin/CmsPlaceholder";

/**
 * CMS foundation placeholder (Checkpoint 01) — Currencies. The
 * underlying data already exists (`Currency` / `CountryCurrency`
 * models, seeded and used by the Create Request form today via
 * src/lib/request-form-options.ts). This screen is intentionally not
 * wired to a management UI yet; that lands in a future checkpoint.
 */
export default async function AdminCurrenciesPage() {
  await requirePermission("currencies:view");

  return (
    <CmsPlaceholder
      title="العملات"
      description="إدارة العملات المدعومة على المنصة وربطها بالدول"
      icon={Coins}
      plannedControls={[
        "عرض العملات الحالية (تُدار اليوم عبر جدول Currency الموجود)",
        "إضافة عملة جديدة بدون أي تعديل برمجي",
        "ربط/فصل عملة بدولة معينة عبر جدول CountryCurrency الموجود",
        "تحديد العملة الافتراضية لكل دولة",
      ]}
    />
  );
}
