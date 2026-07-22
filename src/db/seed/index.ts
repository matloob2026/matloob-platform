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
 *
 * CMS Checkpoint 06 (final Static Pages / Public Pages CMS task) adds:
 * the 7 "fixed-slot" Static Pages (about/contact/how-it-works/terms/
 * privacy/faq/help-center) that back the site's previously-hardcoded
 * placeholder links — see seedStaticPages() below. Re-running the
 * seed never overwrites title/content an admin has since edited
 * through the CMS (only isPublished/extra are kept in sync).
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

/**
 * CMS Checkpoint 06 (final Static Pages / Public Pages CMS task) —
 * the 7 "fixed-slot" static pages matching the site's existing
 * hardcoded placeholder links (see KNOWN_FIXED_SLOT_SLUGS /
 * KNOWN_LINK_LABEL_TO_SLUG in src/lib/static-page-public-content.ts
 * and src/app/(marketing)/homepage-render.ts). Seeding these with
 * real starter content is what turns those "href=#" placeholders into
 * real working links — see fixKnownPlaceholderLinks. "terms" and
 * "privacy" get navPlacement "footer" (they drive the footer's
 * existing "قانوني" list — see getPublicStaticPageFooterNavLinks);
 * the other five get "none" since they already have a fixed link
 * elsewhere on the page and don't need a second, CMS-driven entry.
 * "المدونة" (Blog) is intentionally NOT included — it stays a
 * separate, not-yet-built system.
 */
async function seedStaticPages(): Promise<void> {
  const pages: {
    slug: string;
    navPlacement: "none" | "footer";
    navOrder: number;
    ar: { title: string; content: string };
    en: { title: string; content: string };
  }[] = [
    {
      slug: "about",
      navPlacement: "none",
      navOrder: 0,
      ar: {
        title: "من نحن",
        content:
          "مطلوب هي أول منصة طلبات في المملكة تقلب الفكرة رأساً على عقب: بدل ما تدور على اللي تحتاجه، انت بس تكتب طلبك وتسيب الباقي علينا.\n\nمن سيارة، لشقة، لوظيفة، لأي خدمة تقدر تتخيلها — مطلوب يوصل طلبك لأفضل الموردين اللي يقدروا يلبوه، وانت تختار العرض المناسب لك.\n\nهدفنا نخلي تجربة الحصول على أي شيء أسهل، أسرع، وأكثر أماناً.",
      },
      en: {
        title: "About Us",
        content:
          "Matloob is the first request-first marketplace in the Kingdom: instead of searching for what you need, you simply post your request and let the right suppliers come to you.\n\nFrom a car to an apartment to a job to any service you can imagine — Matloob connects your request to the suppliers best able to fulfill it, and you choose the offer that suits you.\n\nOur goal is to make finding anything easier, faster, and safer.",
      },
    },
    {
      slug: "contact",
      navPlacement: "none",
      navOrder: 0,
      ar: {
        title: "تواصل معنا",
        content:
          "يسعدنا تواصلك معنا في أي وقت.\n\nللاستفسارات العامة أو الدعم الفني، يمكنك التواصل معنا عبر البريد الإلكتروني وسنقوم بالرد عليك في أقرب وقت ممكن.\n\nنسعى دائماً لتقديم أفضل تجربة ممكنة، ورأيك يهمنا.",
      },
      en: {
        title: "Contact Us",
        content:
          "We'd love to hear from you at any time.\n\nFor general inquiries or technical support, please reach out to us by email and we'll get back to you as soon as possible.\n\nWe're always working to provide the best possible experience, and your feedback matters to us.",
      },
    },
    {
      slug: "how-it-works",
      navPlacement: "none",
      navOrder: 0,
      ar: {
        title: "كيف يعمل مطلوب",
        content:
          "استخدام مطلوب بسيط وسريع، على ثلاث خطوات فقط:\n\n- اكتب طلبك: حدد بالضبط اللي محتاجه، من سيارة لخدمة لوظيفة.\n- استقبل العروض: الموردون المهتمون يرسلولك عروضهم مباشرة.\n- اختر الأنسب: قارن العروض واختر اللي يناسبك من حيث السعر والجودة.\n\nكل ده مجاناً وبدون أي التزام.",
      },
      en: {
        title: "How Matloob Works",
        content:
          "Using Matloob is simple and fast, in just three steps:\n\n- Post your request: describe exactly what you need, from a car to a service to a job.\n- Receive offers: interested suppliers send you their offers directly.\n- Choose the best fit: compare offers and pick the one that suits you best.\n\nAll of this is free, with no obligation.",
      },
    },
    {
      slug: "terms",
      navPlacement: "footer",
      navOrder: 0,
      ar: {
        title: "الشروط والأحكام",
        content:
          "باستخدامك منصة مطلوب فإنك توافق على الشروط والأحكام التالية.\n\nتلتزم بتقديم معلومات صحيحة عند نشر أي طلب، وتتحمل مسؤولية التواصل والاتفاق مع الموردين وفق ما يناسبك.\n\nتحتفظ مطلوب بحق تعديل هذه الشروط في أي وقت، وسيتم إعلامك بأي تحديثات جوهرية.",
      },
      en: {
        title: "Terms & Conditions",
        content:
          "By using the Matloob platform, you agree to the following terms and conditions.\n\nYou agree to provide accurate information when posting any request, and you are responsible for communicating and agreeing with suppliers as suits you.\n\nMatloob reserves the right to modify these terms at any time, and you will be notified of any material updates.",
      },
    },
    {
      slug: "privacy",
      navPlacement: "footer",
      navOrder: 1,
      ar: {
        title: "سياسة الخصوصية",
        content:
          "نحن في مطلوب نأخذ خصوصيتك على محمل الجد.\n\nنجمع فقط المعلومات اللازمة لتقديم الخدمة، ولا نشارك بياناتك مع أي طرف ثالث إلا بموافقتك أو حسب ما يقتضيه القانون.\n\nيمكنك في أي وقت التواصل معنا لطلب تعديل أو حذف بياناتك الشخصية.",
      },
      en: {
        title: "Privacy Policy",
        content:
          "At Matloob, we take your privacy seriously.\n\nWe only collect the information necessary to provide our service, and we do not share your data with any third party except with your consent or as required by law.\n\nYou may contact us at any time to request that your personal data be updated or deleted.",
      },
    },
    {
      slug: "faq",
      navPlacement: "none",
      navOrder: 0,
      ar: {
        title: "الأسئلة الشائعة",
        content:
          "أسئلة شائعة عن مطلوب:\n\n- هل استخدام مطلوب مجاني؟ نعم، نشر الطلبات مجاني بالكامل.\n- كيف أستقبل العروض؟ ستصلك العروض من الموردين المهتمين مباشرة بعد نشر طلبك.\n- هل يمكنني إلغاء طلبي؟ نعم، يمكنك إغلاق أو حذف طلبك في أي وقت من صفحة طلباتي.",
      },
      en: {
        title: "Frequently Asked Questions",
        content:
          "Frequently asked questions about Matloob:\n\n- Is Matloob free to use? Yes, posting requests is completely free.\n- How do I receive offers? Interested suppliers will send offers directly after you post your request.\n- Can I cancel my request? Yes, you can close or delete your request at any time from My Requests.",
      },
    },
    {
      slug: "help-center",
      navPlacement: "none",
      navOrder: 0,
      ar: {
        title: "مركز المساعدة",
        content:
          "مركز المساعدة هنا لدعمك في كل خطوة.\n\nإذا واجهت أي مشكلة تقنية أو كان لديك استفسار حول كيفية استخدام المنصة، يسعدنا مساعدتك.\n\nيمكنك أيضاً مراجعة صفحة الأسئلة الشائعة أو التواصل معنا مباشرة.",
      },
      en: {
        title: "Help Center",
        content:
          "The Help Center is here to support you every step of the way.\n\nIf you run into a technical issue or have a question about how to use the platform, we're happy to help.\n\nYou can also check our FAQ page or contact us directly.",
      },
    },
  ];

  for (const page of pages) {
    const extra = { navPlacement: page.navPlacement, navOrder: page.navOrder };
    for (const [locale, { title, content }] of [
      ["ar", page.ar],
      ["en", page.en],
    ] as const) {
      await prisma.pageContent.upsert({
        where: { page_section_locale: { page: page.slug, section: "main", locale } },
        create: {
          page: page.slug,
          section: "main",
          locale,
          heading: title,
          body: content,
          isPublished: true,
          extra,
        },
        // Only isPublished/extra are kept in sync on re-seed — title/
        // content are left alone if an admin already edited them
        // through the CMS, so re-running the seed never clobbers real
        // admin edits.
        update: { isPublished: true, extra },
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

  console.log("Seeding static pages (about, contact, how-it-works, terms, privacy, faq, help-center)...");
  await seedStaticPages();

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
