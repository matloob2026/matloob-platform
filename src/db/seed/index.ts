/**
 * Database seed script — `npm run db:seed`.
 *
 * Populates the reference data the Create Request form's dropdowns
 * read via src/lib/request-form-options.ts: Category, Country, City,
 * Currency (+ CountryCurrency links). Idempotent — every row is
 * upserted on its natural unique key (slug/code), so running this
 * multiple times (e.g. on every deploy) never creates duplicates or
 * throws on a second run.
 *
 * CMS Checkpoint 02 adds: the homepage's hero `PageContent` row
 * (headline/subtitle/CTA), `HomepageStat`, and `TrustBadge` — seeded
 * with the platform's existing hardcoded values so the Admin CMS's
 * "Homepage Content" screen starts out managing the SAME content
 * already live on the homepage, rather than an empty list (see
 * src/content/marketing/homepage-body.html for the values being
 * mirrored here). Admin-user seeding and SiteSetting rows remain out
 * of scope, unchanged from before.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CategorySeed {
  slug: string;
  sortOrder: number;
  ar: string;
  en: string;
}

const CATEGORIES: CategorySeed[] = [
  { slug: "real-estate", sortOrder: 1, ar: "عقارات", en: "Real Estate" },
  { slug: "cars", sortOrder: 2, ar: "سيارات", en: "Cars" },
  { slug: "jobs", sortOrder: 3, ar: "وظائف", en: "Jobs" },
  { slug: "electronics", sortOrder: 4, ar: "إلكترونيات", en: "Electronics" },
  { slug: "services", sortOrder: 5, ar: "خدمات", en: "Services" },
  { slug: "furniture", sortOrder: 6, ar: "أثاث", en: "Furniture" },
  { slug: "travel", sortOrder: 7, ar: "سفر", en: "Travel" },
  { slug: "pets", sortOrder: 8, ar: "حيوانات أليفة", en: "Pets" },
  { slug: "fashion", sortOrder: 9, ar: "أزياء", en: "Fashion" },
  { slug: "business", sortOrder: 10, ar: "أعمال", en: "Business" },
  { slug: "construction", sortOrder: 11, ar: "بناء وتشييد", en: "Construction" },
  { slug: "education", sortOrder: 12, ar: "تعليم", en: "Education" },
  { slug: "health", sortOrder: 13, ar: "صحة", en: "Health" },
  { slug: "other", sortOrder: 99, ar: "أخرى", en: "Other" },
];

interface CitySeed {
  slug: string;
  sortOrder: number;
  ar: string;
  en: string;
}

interface CountrySeed {
  code: string;
  isDefault: boolean;
  phoneDialCode?: string;
  ar: string;
  en: string;
  cities?: CitySeed[];
  /** Currency codes to link, first one marked isDefault. */
  currencies: string[];
}

const SAUDI_CITIES: CitySeed[] = [
  { slug: "jeddah", sortOrder: 1, ar: "جدة", en: "Jeddah" },
  { slug: "riyadh", sortOrder: 2, ar: "الرياض", en: "Riyadh" },
  { slug: "dammam", sortOrder: 3, ar: "الدمام", en: "Dammam" },
  { slug: "makkah", sortOrder: 4, ar: "مكة المكرمة", en: "Makkah" },
  { slug: "madinah", sortOrder: 5, ar: "المدينة المنورة", en: "Madinah" },
  { slug: "abha", sortOrder: 6, ar: "أبها", en: "Abha" },
  { slug: "jazan", sortOrder: 7, ar: "جازان", en: "Jazan" },
  { slug: "tabuk", sortOrder: 8, ar: "تبوك", en: "Tabuk" },
  { slug: "taif", sortOrder: 9, ar: "الطائف", en: "Taif" },
  { slug: "khobar", sortOrder: 10, ar: "الخبر", en: "Khobar" },
  { slug: "yanbu", sortOrder: 11, ar: "ينبع", en: "Yanbu" },
  { slug: "other", sortOrder: 99, ar: "أخرى", en: "Other" },
];

const EGYPT_CITIES: CitySeed[] = [
  { slug: "cairo", sortOrder: 1, ar: "القاهرة", en: "Cairo" },
  { slug: "alexandria", sortOrder: 2, ar: "الإسكندرية", en: "Alexandria" },
  { slug: "giza", sortOrder: 3, ar: "الجيزة", en: "Giza" },
  { slug: "mansoura", sortOrder: 4, ar: "المنصورة", en: "Mansoura" },
  { slug: "tanta", sortOrder: 5, ar: "طنطا", en: "Tanta" },
  { slug: "zagazig", sortOrder: 6, ar: "الزقازيق", en: "Zagazig" },
  { slug: "aswan", sortOrder: 7, ar: "أسوان", en: "Aswan" },
  { slug: "luxor", sortOrder: 8, ar: "الأقصر", en: "Luxor" },
  { slug: "other", sortOrder: 99, ar: "أخرى", en: "Other" },
];

const COUNTRIES: CountrySeed[] = [
  { code: "SA", isDefault: true, phoneDialCode: "+966", ar: "المملكة العربية السعودية", en: "Saudi Arabia", cities: SAUDI_CITIES, currencies: ["SAR", "USD"] },
  { code: "EG", isDefault: false, phoneDialCode: "+20", ar: "مصر", en: "Egypt", cities: EGYPT_CITIES, currencies: ["EGP", "USD"] },
  { code: "AE", isDefault: false, phoneDialCode: "+971", ar: "الإمارات العربية المتحدة", en: "United Arab Emirates", currencies: ["AED", "USD"] },
  { code: "KW", isDefault: false, phoneDialCode: "+965", ar: "الكويت", en: "Kuwait", currencies: ["KWD", "USD"] },
  { code: "QA", isDefault: false, phoneDialCode: "+974", ar: "قطر", en: "Qatar", currencies: ["QAR", "USD"] },
  { code: "BH", isDefault: false, phoneDialCode: "+973", ar: "البحرين", en: "Bahrain", currencies: ["BHD", "USD"] },
  { code: "OM", isDefault: false, phoneDialCode: "+968", ar: "عُمان", en: "Oman", currencies: ["OMR", "USD"] },
  { code: "JO", isDefault: false, phoneDialCode: "+962", ar: "الأردن", en: "Jordan", currencies: ["USD"] },
  { code: "MA", isDefault: false, phoneDialCode: "+212", ar: "المغرب", en: "Morocco", currencies: ["USD"] },
  { code: "XX", isDefault: false, ar: "أخرى", en: "Other", currencies: ["USD"] },
];

const CURRENCIES: { code: string; symbol: string }[] = [
  { code: "SAR", symbol: "ر.س" },
  { code: "EGP", symbol: "ج.م" },
  { code: "USD", symbol: "$" },
  { code: "AED", symbol: "د.إ" },
  { code: "KWD", symbol: "د.ك" },
  { code: "QAR", symbol: "ر.ق" },
  { code: "BHD", symbol: "د.ب" },
  { code: "OMR", symbol: "ر.ع" },
];

async function seedCurrencies(): Promise<Map<string, string>> {
  const idByCode = new Map<string, string>();
  for (const c of CURRENCIES) {
    const row = await prisma.currency.upsert({
      where: { code: c.code },
      create: { code: c.code, symbol: c.symbol, decimalDigits: 2 },
      update: { symbol: c.symbol },
    });
    idByCode.set(c.code, row.id);
  }
  return idByCode;
}

async function seedCategories(): Promise<void> {
  for (const cat of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: { slug: cat.slug, sortOrder: cat.sortOrder, isActive: true },
      update: { sortOrder: cat.sortOrder, isActive: true },
    });

    for (const [locale, name] of [
      ["ar", cat.ar],
      ["en", cat.en],
    ] as const) {
      await prisma.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: row.id, locale } },
        create: { categoryId: row.id, locale, name },
        update: { name },
      });
    }
  }
}

async function seedCountriesAndCities(currencyIdByCode: Map<string, string>): Promise<void> {
  for (const country of COUNTRIES) {
    const countryRow = await prisma.country.upsert({
      where: { code: country.code },
      create: {
        code: country.code,
        isActive: true,
        isDefault: country.isDefault,
        defaultLocale: "ar",
        phoneDialCode: country.phoneDialCode,
      },
      update: {
        isActive: true,
        isDefault: country.isDefault,
        phoneDialCode: country.phoneDialCode,
      },
    });

    for (const [locale, name] of [
      ["ar", country.ar],
      ["en", country.en],
    ] as const) {
      await prisma.countryTranslation.upsert({
        where: { countryId_locale: { countryId: countryRow.id, locale } },
        create: { countryId: countryRow.id, locale, name },
        update: { name },
      });
    }

    for (const [index, currencyCode] of country.currencies.entries()) {
      const currencyId = currencyIdByCode.get(currencyCode);
      if (!currencyId) continue;
      await prisma.countryCurrency.upsert({
        where: { countryId_currencyId: { countryId: countryRow.id, currencyId } },
        create: { countryId: countryRow.id, currencyId, isDefault: index === 0 },
        update: { isDefault: index === 0 },
      });
    }

    for (const city of country.cities ?? []) {
      const cityRow = await prisma.city.upsert({
        where: { countryId_slug: { countryId: countryRow.id, slug: city.slug } },
        create: { countryId: countryRow.id, slug: city.slug, sortOrder: city.sortOrder, isActive: true },
        update: { sortOrder: city.sortOrder, isActive: true },
      });

      for (const [locale, name] of [
        ["ar", city.ar],
        ["en", city.en],
      ] as const) {
        await prisma.cityTranslation.upsert({
          where: { cityId_locale: { cityId: cityRow.id, locale } },
          create: { cityId: cityRow.id, locale, name },
          update: { name },
        });
      }
    }
  }
}

async function seedHomepageContent(): Promise<void> {
  // Hero PageContent row — matches src/content/marketing/homepage-body.html's
  // current hardcoded headline/subtitle/CTA exactly, so seeding this does
  // NOT change what the public homepage renders (see
  // getPublicHomepageMainContent's fallback in
  // src/lib/homepage-public-content.ts either way).
  for (const [locale, heading, body, ctaLabel] of [
    [
      "ar",
      "قولنا إيه اللي محتاجه...وسيّب الباقي علينا.",
      "بدل ما تدور... اطلبها وبكل سهولة تجيلك! سيارة، شقة، وظيفة، أو أي خدمة تحتاجها. حدد طلبك، ومطلوب هيوفرهولك مجاناً.",
      "أضف طلبك الآن",
    ],
    [
      "en",
      "Tell us what you need... and leave the rest to us.",
      "Instead of searching... request it and it comes to you easily! A car, an apartment, a job, or any service you need.",
      "Add your request now",
    ],
  ] as const) {
    await prisma.pageContent.upsert({
      where: { page_section_locale: { page: "homepage", section: "hero", locale } },
      create: { page: "homepage", section: "hero", locale, heading, body, ctaLabel, ctaUrl: "/create-request" },
      update: { heading, body, ctaLabel, ctaUrl: "/create-request" },
    });
  }

  const stats: { key: string; value: number; labelAr: string; labelEn: string; sortOrder: number }[] = [
    { key: "requests_published", value: 25000, labelAr: "طلب منشور", labelEn: "Requests Published", sortOrder: 0 },
    { key: "active_members", value: 15000, labelAr: "عضو نشط", labelEn: "Active Members", sortOrder: 1 },
    { key: "requests_completed", value: 9000, labelAr: "طلب تم تنفيذه", labelEn: "Requests Completed", sortOrder: 2 },
    { key: "requests_today", value: 1200, labelAr: "طلبات جديدة اليوم", labelEn: "New Requests Today", sortOrder: 3 },
  ];
  for (const stat of stats) {
    const row = await prisma.homepageStat.upsert({
      where: { key: stat.key },
      create: { key: stat.key, value: stat.value, sortOrder: stat.sortOrder, isActive: true },
      update: { value: stat.value, sortOrder: stat.sortOrder },
    });
    for (const [locale, label] of [
      ["ar", stat.labelAr],
      ["en", stat.labelEn],
    ] as const) {
      await prisma.homepageStatTranslation.upsert({
        where: { statId_locale: { statId: row.id, locale } },
        create: { statId: row.id, locale, label },
        update: { label },
      });
    }
  }

  // TrustBadge has no natural unique key (no slug/code) — matched by its
  // Arabic label instead, which is stable and unique for these two seed
  // rows; new badges added later through the Admin CMS aren't affected.
  const badges: { labelAr: string; labelEn: string; sortOrder: number }[] = [
    { labelAr: "دفع وتواصل آمن", labelEn: "Secure payment & contact", sortOrder: 0 },
    { labelAr: "دعم فني 24/7", labelEn: "24/7 support", sortOrder: 1 },
  ];
  for (const badge of badges) {
    const existing = await prisma.trustBadgeTranslation.findFirst({
      where: { locale: "ar", label: badge.labelAr },
      select: { badgeId: true },
    });
    const row = existing
      ? await prisma.trustBadge.update({ where: { id: existing.badgeId }, data: { sortOrder: badge.sortOrder } })
      : await prisma.trustBadge.create({ data: { sortOrder: badge.sortOrder, isActive: true } });

    for (const [locale, label] of [
      ["ar", badge.labelAr],
      ["en", badge.labelEn],
    ] as const) {
      await prisma.trustBadgeTranslation.upsert({
        where: { badgeId_locale: { badgeId: row.id, locale } },
        create: { badgeId: row.id, locale, label },
        update: { label },
      });
    }
  }
}

async function main(): Promise<void> {
  console.log("Seeding currencies...");
  const currencyIdByCode = await seedCurrencies();

  console.log("Seeding categories...");
  await seedCategories();

  console.log("Seeding countries, cities, and country-currency links...");
  await seedCountriesAndCities(currencyIdByCode);

  console.log("Seeding homepage content (hero, stats, trust badges)...");
  await seedHomepageContent();

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
