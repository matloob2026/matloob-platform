export interface AdminCountryRow {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  currency: string;
  isActive: boolean;
  isDefault: boolean;
  cityCount: number;
}

export interface AdminCityRow {
  id: string;
  countryId: string;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
}

export const MOCK_COUNTRIES: AdminCountryRow[] = [
  { id: "country-sa", code: "SA", nameAr: "المملكة العربية السعودية", nameEn: "Saudi Arabia", currency: "SAR", isActive: true, isDefault: true, cityCount: 6 },
  { id: "country-eg", code: "EG", nameAr: "مصر", nameEn: "Egypt", currency: "EGP", isActive: false, isDefault: false, cityCount: 3 },
  { id: "country-ae", code: "AE", nameAr: "الإمارات العربية المتحدة", nameEn: "United Arab Emirates", currency: "AED", isActive: false, isDefault: false, cityCount: 0 },
];

export const MOCK_CITIES: AdminCityRow[] = [
  { id: "city-1", countryId: "country-sa", nameAr: "الرياض", nameEn: "Riyadh", isActive: true },
  { id: "city-2", countryId: "country-sa", nameAr: "جدة", nameEn: "Jeddah", isActive: true },
  { id: "city-3", countryId: "country-sa", nameAr: "الدمام", nameEn: "Dammam", isActive: true },
  { id: "city-4", countryId: "country-sa", nameAr: "مكة المكرمة", nameEn: "Makkah", isActive: true },
  { id: "city-5", countryId: "country-sa", nameAr: "المدينة المنورة", nameEn: "Madinah", isActive: true },
  { id: "city-6", countryId: "country-sa", nameAr: "الخبر", nameEn: "Al Khobar", isActive: true },
  { id: "city-7", countryId: "country-eg", nameAr: "القاهرة", nameEn: "Cairo", isActive: false },
  { id: "city-8", countryId: "country-eg", nameAr: "الإسكندرية", nameEn: "Alexandria", isActive: false },
  { id: "city-9", countryId: "country-eg", nameAr: "الجيزة", nameEn: "Giza", isActive: false },
];

export async function listCountriesMock(): Promise<AdminCountryRow[]> {
  return MOCK_COUNTRIES;
}

export async function listCitiesMock(countryId?: string): Promise<AdminCityRow[]> {
  return countryId ? MOCK_CITIES.filter((c) => c.countryId === countryId) : MOCK_CITIES;
}
