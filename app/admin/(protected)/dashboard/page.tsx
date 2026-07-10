import { Users, ClipboardList, HandCoins, Activity, Flag, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { AreaChartCard, BarChartCard } from "@/components/admin/ChartCard";
import {
  getDashboardStatsMock,
  getRequestsTrendMock,
  getOffersByCategoryMock,
} from "@/services/mock/dashboard.mock";

/**
 * Server component — fetches mock data directly (no client-side
 * fetching needed for a read-only overview). Once Phase 3 wires up
 * real services, only the three `*Mock` imports below change to their
 * `src/services/*.service.ts` equivalents; the JSX is untouched.
 */
export default async function AdminDashboardPage() {
  const [stats, requestsTrend, offersByCategory] = await Promise.all([
    getDashboardStatsMock(),
    getRequestsTrendMock(),
    getOffersByCategoryMock(),
  ]);

  return (
    <div>
      <PageHeader title="نظرة عامة" description="ملخص أداء المنصة اليوم" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="إجمالي المستخدمين" value={stats.totalUsers.toLocaleString()} icon={Users} trend={{ value: "+4.2%", direction: "up" }} />
        <StatCard label="إجمالي الطلبات" value={stats.totalRequests.toLocaleString()} icon={ClipboardList} trend={{ value: "+8.1%", direction: "up" }} />
        <StatCard label="إجمالي العروض" value={stats.totalOffers.toLocaleString()} icon={HandCoins} trend={{ value: "+12%", direction: "up" }} />
        <StatCard label="طلبات نشطة" value={stats.activeRequests.toLocaleString()} icon={Activity} trend={{ value: "مستقر", direction: "flat" }} />
        <StatCard label="بلاغات بانتظار المراجعة" value={stats.pendingReports} icon={Flag} trend={{ value: "يحتاج مراجعة", direction: "down" }} />
        <StatCard label="طلبات مكتملة" value={stats.fulfilledRequests.toLocaleString()} icon={CheckCircle2} trend={{ value: "+5.6%", direction: "up" }} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AreaChartCard title="الطلبات المنشورة خلال آخر 7 أيام" data={requestsTrend} />
        <BarChartCard title="العروض حسب التصنيف" data={offersByCategory} color="#0C93A8" />
      </div>

      <p className="mt-6 text-center text-xs text-text-400">
        * البيانات المعروضة هنا تجريبية (Mock Data) لغرض معاينة الواجهة، وسيتم ربطها بقاعدة
        البيانات الفعلية في مرحلة لاحقة.
      </p>
    </div>
  );
}
