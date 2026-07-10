import type { Paginated, RequestStatus } from "@/types/domain";

export interface AdminRequestRow {
  id: string;
  title: string;
  category: string;
  owner: string;
  city: string;
  status: RequestStatus;
  offerCount: number;
  budget?: string;
  createdAt: string;
}

const TITLES = [
  "مطلوب شقة للإيجار 3 غرف", "مطلوب سيارة دفع رباعي موديل حديث", "مطلوب فني كهرباء منزلي",
  "مطلوب آيفون 15 برو ماكس", "مطلوب طقم كنب مودرن", "مطلوب لابتوب للتصميم",
  "مطلوب محاسب مالي بدوام كامل", "مطلوب مدرب كلاب محترف", "مطلوب حقيبة سفر فاخرة",
  "مطلوب فيلا للبيع دور واحد", "مطلوب مصمم ديكور داخلي", "مطلوب سيارة اقتصادية للعائلة",
];
const CATEGORIES = ["عقارات", "سيارات", "خدمات", "جوالات", "أثاث منزلي", "أجهزة", "وظائف", "حيوانات أليفة", "سفر وسياحة"];
const CITIES = ["الرياض", "جدة", "الدمام", "مكة", "الخبر"];
const STATUSES: RequestStatus[] = ["PUBLISHED", "PUBLISHED", "IN_PROGRESS", "FULFILLED", "DRAFT", "EXPIRED"];

function generateMockRequests(count: number): AdminRequestRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `req-${i + 1}`,
    title: TITLES[i % TITLES.length]!,
    category: CATEGORIES[i % CATEGORIES.length]!,
    owner: `مستخدم ${(i % 40) + 1}`,
    city: CITIES[i % CITIES.length]!,
    status: STATUSES[i % STATUSES.length]!,
    offerCount: Math.floor(Math.random() * 15),
    budget: i % 3 === 0 ? undefined : `${(i + 1) * 350} ر.س`,
    createdAt: new Date(Date.now() - i * 43_200_000).toISOString(),
  }));
}

const ALL_MOCK_REQUESTS = generateMockRequests(96);

export interface ListRequestsAdminFilter {
  search?: string;
  status?: RequestStatus;
  category?: string;
  page?: number;
  pageSize?: number;
}

export async function listRequestsMock(
  filter: ListRequestsAdminFilter
): Promise<Paginated<AdminRequestRow>> {
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 10;

  let items = ALL_MOCK_REQUESTS;
  if (filter.search) {
    const q = filter.search.toLowerCase();
    items = items.filter((r) => r.title.toLowerCase().includes(q));
  }
  if (filter.status) items = items.filter((r) => r.status === filter.status);
  if (filter.category) items = items.filter((r) => r.category === filter.category);

  const totalItems = items.length;
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}
