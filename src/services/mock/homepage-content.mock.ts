export interface MockHeroContent {
  headingAr: string;
  headingEn: string;
  bodyAr: string;
  bodyEn: string;
  ctaLabelAr: string;
  ctaLabelEn: string;
}

export interface MockCtaContent {
  headingAr: string;
  bodyAr: string;
  ctaLabelAr: string;
}

export interface MockFooterContent {
  statementAr: string;
}

export interface MockStat {
  id: string;
  key: string;
  value: number;
  labelAr: string;
}

export const MOCK_HERO: MockHeroContent = {
  headingAr: "قولنا إيه اللي محتاجه... وسيّب الباقي علينا.",
  headingEn: "Say what you need... and leave the rest to us.",
  bodyAr:
    "بدل ما تدور... اطلبها وبكل سهولة تجيلك!\nسيارة، شقة، وظيفة، أو أي خدمة تحتاجها.\nحدد طلبك، ومطلوب هيوفرهولك مجاناً.",
  bodyEn: "Instead of searching... request it and it comes to you.",
  ctaLabelAr: "أضف طلبك",
  ctaLabelEn: "Add Your Request",
};

export const MOCK_CTA: MockCtaContent = {
  headingAr: "عندك طلب؟ خلي مطلوب يشتغل عليه",
  bodyAr: "أضف طلبك مجاناً وابدأ باستقبال العروض",
  ctaLabelAr: "أضف طلبك الآن",
};

export const MOCK_FOOTER: MockFooterContent = {
  statementAr: "منصة مطلوب... أول منصة في الوطن العربي صُممت لتبدأ من احتياجات المشتري.",
};

export const MOCK_STATS: MockStat[] = [
  { id: "stat-1", key: "requests_published", value: 25000, labelAr: "طلب منشور" },
  { id: "stat-2", key: "active_members", value: 15000, labelAr: "عضو نشط" },
  { id: "stat-3", key: "requests_fulfilled", value: 9000, labelAr: "طلب تم تنفيذه" },
  { id: "stat-4", key: "requests_today", value: 1200, labelAr: "طلبات جديدة اليوم" },
];

export async function getMockHomepageContent() {
  return { hero: MOCK_HERO, cta: MOCK_CTA, footer: MOCK_FOOTER, stats: MOCK_STATS };
}
