export interface AdminCategoryRow {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  requestCount: number;
  isActive: boolean;
  sortOrder: number;
}

export const MOCK_CATEGORIES: AdminCategoryRow[] = [
  { id: "cat-1", nameAr: "عقارات", nameEn: "Real Estate", slug: "real-estate", requestCount: 1240, isActive: true, sortOrder: 1 },
  { id: "cat-2", nameAr: "سيارات", nameEn: "Cars", slug: "cars", requestCount: 980, isActive: true, sortOrder: 2 },
  { id: "cat-3", nameAr: "جوالات", nameEn: "Phones", slug: "phones", requestCount: 640, isActive: true, sortOrder: 3 },
  { id: "cat-4", nameAr: "وظائف", nameEn: "Jobs", slug: "jobs", requestCount: 512, isActive: true, sortOrder: 4 },
  { id: "cat-5", nameAr: "خدمات", nameEn: "Services", slug: "services", requestCount: 875, isActive: true, sortOrder: 5 },
  { id: "cat-6", nameAr: "أثاث منزلي", nameEn: "Furniture", slug: "furniture", requestCount: 320, isActive: true, sortOrder: 6 },
  { id: "cat-7", nameAr: "حيوانات أليفة", nameEn: "Pets", slug: "pets", requestCount: 145, isActive: true, sortOrder: 7 },
  { id: "cat-8", nameAr: "سفر وسياحة", nameEn: "Travel", slug: "travel", requestCount: 210, isActive: true, sortOrder: 8 },
];

export async function listCategoriesMock(): Promise<AdminCategoryRow[]> {
  return MOCK_CATEGORIES;
}
