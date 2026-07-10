import type { Paginated, OfferStatus } from "@/types/domain";

export interface AdminOfferRow {
  id: string;
  requestTitle: string;
  supplier: string;
  price?: string;
  status: OfferStatus;
  createdAt: string;
}

const STATUSES: OfferStatus[] = ["PENDING", "PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"];

function generateMockOffers(count: number): AdminOfferRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `offer-${i + 1}`,
    requestTitle: `مطلوب طلب رقم ${(i % 30) + 1}`,
    supplier: `مورد ${(i % 25) + 1}`,
    price: i % 4 === 0 ? undefined : `${(i + 1) * 210} ر.س`,
    status: STATUSES[i % STATUSES.length]!,
    createdAt: new Date(Date.now() - i * 21_600_000).toISOString(),
  }));
}

const ALL_MOCK_OFFERS = generateMockOffers(80);

export interface ListOffersFilter {
  search?: string;
  status?: OfferStatus;
  page?: number;
  pageSize?: number;
}

export async function listOffersMock(filter: ListOffersFilter): Promise<Paginated<AdminOfferRow>> {
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 10;

  let items = ALL_MOCK_OFFERS;
  if (filter.search) {
    const q = filter.search.toLowerCase();
    items = items.filter(
      (o) => o.requestTitle.toLowerCase().includes(q) || o.supplier.toLowerCase().includes(q)
    );
  }
  if (filter.status) items = items.filter((o) => o.status === filter.status);

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
