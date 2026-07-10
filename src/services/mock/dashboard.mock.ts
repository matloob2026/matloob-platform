import type { ChartPoint } from "@/components/admin/ChartCard";

export interface DashboardStats {
  totalUsers: number;
  totalRequests: number;
  totalOffers: number;
  activeRequests: number;
  pendingReports: number;
  fulfilledRequests: number;
}

export async function getDashboardStatsMock(): Promise<DashboardStats> {
  return {
    totalUsers: 5773,
    totalRequests: 9626,
    totalOffers: 14208,
    activeRequests: 1842,
    pendingReports: 7,
    fulfilledRequests: 6120,
  };
}

const DAYS_AR = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

export async function getRequestsTrendMock(): Promise<ChartPoint[]> {
  return DAYS_AR.map((label, i) => ({ label, value: 120 + i * 18 + (i % 2 === 0 ? 30 : 0) }));
}

export async function getOffersByCategoryMock(): Promise<ChartPoint[]> {
  return [
    { label: "عقارات", value: 1240 },
    { label: "سيارات", value: 980 },
    { label: "خدمات", value: 875 },
    { label: "جوالات", value: 640 },
    { label: "أثاث", value: 320 },
  ];
}
