/**
 * Mock data layer for Phase 2 (Admin Dashboard UI). Every function here
 * mirrors the exact async signature and return shape
 * (`Paginated<T>` from src/types/domain.ts) that the real Prisma-backed
 * service will expose. Admin pages call these functions today; Phase 3+
 * swaps the implementation to real `src/services/*.service.ts` calls
 * without changing a single page component's calling code.
 */

import type { Paginated, UserRole, UserStatus } from "@/types/domain";

export interface AdminUserRow {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  city?: string;
  requestCount: number;
  offerCount: number;
  createdAt: string;
}

const NAMES = [
  "أحمد المطيري", "سارة العتيبي", "محمد القحطاني", "نورة الحربي", "خالد الشمري",
  "منى الدوسري", "عبدالله الزهراني", "ريم الغامدي", "فهد العنزي", "لطيفة الشهري",
  "يوسف السبيعي", "هند البقمي", "تركي المالكي", "عبير الرشيدي", "سلطان الفيفي",
];
const CITIES = ["الرياض", "جدة", "الدمام", "مكة", "المدينة المنورة", "الخبر"];
const ROLES: UserRole[] = ["BUYER", "SUPPLIER", "BOTH"];
const STATUSES: UserStatus[] = ["ACTIVE", "ACTIVE", "ACTIVE", "PENDING_VERIFICATION", "SUSPENDED"];

function generateMockUsers(count: number): AdminUserRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i + 1}`,
    displayName: NAMES[i % NAMES.length]!,
    email: `user${i + 1}@example.com`,
    role: ROLES[i % ROLES.length]!,
    status: STATUSES[i % STATUSES.length]!,
    city: CITIES[i % CITIES.length],
    requestCount: Math.floor(Math.random() * 12),
    offerCount: Math.floor(Math.random() * 20),
    createdAt: new Date(Date.now() - i * 86_400_000).toISOString(),
  }));
}

const ALL_MOCK_USERS = generateMockUsers(64);

export interface ListUsersFilter {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  pageSize?: number;
}

export async function listUsersMock(filter: ListUsersFilter): Promise<Paginated<AdminUserRow>> {
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 10;

  let items = ALL_MOCK_USERS;
  if (filter.search) {
    const q = filter.search.toLowerCase();
    items = items.filter(
      (u) => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }
  if (filter.role) items = items.filter((u) => u.role === filter.role);
  if (filter.status) items = items.filter((u) => u.status === filter.status);

  const totalItems = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return {
    items: paged,
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}
