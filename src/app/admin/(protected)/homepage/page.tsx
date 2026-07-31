"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { ImagePlus, Save } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Tabs } from "@/components/admin/Tabs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField } from "@/components/ui/Field";
import { TranslationTabs } from "@/components/admin/TranslationTabs";
import { TableSkeleton } from "@/components/admin/Skeleton";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { useToast } from "@/components/ui/ToastProvider";
import {
  getMockHomepageContent,
  type MockCtaContent,
  type MockFooterContent,
} from "@/services/mock/homepage-content.mock";
import type {
  HomepageMainContentItem,
  HomepageStatListItem,
  TrustBadgeListItem,
  HeroImageSlot,
} from "@/services/homepage-content.service";
import {
  getHomepageMainContentAction,
  listHomepageStatsAction,
  listTrustBadgesAction,
  saveHomepageMainContentAction,
} from "./actions";
import { HomepageStatsManager } from "./HomepageStatsManager";
import { TrustBadgesManager } from "./TrustBadgesManager";

function SaveBar() {
  return (
    <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
      <Button variant="ghost">إلغاء التغييرات</Button>
      <Button>
        <Save className="h-4 w-4" /> حفظ ونشر
      </Button>
    </div>
  );
}

function LogoSection() {
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">الشعار (Logo)</h3>
      <div className="flex items-center gap-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface-muted">
          <ImagePlus className="h-6 w-6 text-text-400" />
        </div>
        <div>
          <Button variant="outline" size="sm">اختيار من مكتبة الوسائط</Button>
          <p className="mt-2 text-xs text-text-400">PNG بخلفية شفافة، الحد الأقصى 2MB</p>
        </div>
      </div>
      <SaveBar />
    </Card>
  );
}

/** Mirrors HERO_IMAGE_SLOTS in src/services/homepage-content.service.ts
 * exactly (kept as a local literal, not imported, since that service
 * file is server-only and can't be bundled into this client
 * component) — each label names the illustration that slot defaults
 * to in src/content/marketing/homepage-body.html. */
const HERO_IMAGE_SLOT_LABELS: { slot: HeroImageSlot; label: string }[] = [
  { slot: "car", label: "سيارة" },
  { slot: "house", label: "منزل" },
  { slot: "phone", label: "جوال" },
  { slot: "package", label: "مكتب / وظائف" },
  { slot: "laptop", label: "لابتوب" },
  { slot: "dog", label: "قطة" },
  { slot: "luggage", label: "حقيبة سفر" },
  { slot: "toolbox", label: "صندوق أدوات" },
];

const EMPTY_MAIN_CONTENT: HomepageMainContentItem = {
  headingAr: "",
  headingEn: "",
  bodyAr: "",
  bodyEn: "",
  ctaLabelAr: "",
  ctaLabelEn: "",
  ctaUrl: "",
  heroImages: {
    car: null,
    house: null,
    phone: null,
    package: null,
    laptop: null,
    dog: null,
    luggage: null,
    toolbox: null,
  },
};

/**
 * Homepage Main Content — Checkpoint 02's first real, database-backed
 * field group: headline, subtitle, CTA button text, CTA destination.
 * Reuses the existing PageContent(section: "hero") model — see
 * src/services/homepage-content.service.ts's HomepageAdminContentService.
 *
 * Hero IMAGES (the side illustrations) are also real and
 * database-backed — each of the 8 illustration slots picks an existing
 * Media Library image via `<MediaPicker>`, stored in
 * `PageContent(hero,ar).extra` (see `HERO_IMAGE_SLOTS` in
 * homepage-content.service.ts) — no schema change.
 */
function HeroSection({ initialContent }: { initialContent: HomepageMainContentItem | null }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [values, setValues] = useState<HomepageMainContentItem>(initialContent ?? EMPTY_MAIN_CONTENT);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSave() {
    setError(undefined);
    setIsSaving(true);
    const result = await saveHomepageMainContentAction({
      headingAr: values.headingAr,
      headingEn: values.headingEn,
      bodyAr: values.bodyAr,
      bodyEn: values.bodyEn,
      ctaLabelAr: values.ctaLabelAr,
      ctaLabelEn: values.ctaLabelEn,
      ctaUrl: values.ctaUrl,
      heroImages: {
        car: values.heroImages.car?.id ?? null,
        house: values.heroImages.house?.id ?? null,
        phone: values.heroImages.phone?.id ?? null,
        package: values.heroImages.package?.id ?? null,
        laptop: values.heroImages.laptop?.id ?? null,
        dog: values.heroImages.dog?.id ?? null,
        luggage: values.heroImages.luggage?.id ?? null,
        toolbox: values.heroImages.toolbox?.id ?? null,
      },
    });
    setIsSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    showToast("تم حفظ محتوى الصفحة الرئيسية بنجاح.", "success");
    router.refresh();
  }

  function handleCancel() {
    setValues(initialContent ?? EMPTY_MAIN_CONTENT);
    setError(undefined);
  }

  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">القسم الرئيسي (Hero)</h3>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <TranslationTabs
          render={(locale) => (
            <div className="space-y-4">
              <FormField label={locale === "ar" ? "العنوان الرئيسي" : "Headline"}>
                <Input
                  value={locale === "ar" ? values.headingAr : values.headingEn}
                  onChange={(e) =>
                    setValues((v) =>
                      locale === "ar" ? { ...v, headingAr: e.target.value } : { ...v, headingEn: e.target.value }
                    )
                  }
                />
              </FormField>
              <FormField label={locale === "ar" ? "الوصف" : "Description"}>
                <Textarea
                  rows={4}
                  value={locale === "ar" ? values.bodyAr : values.bodyEn}
                  onChange={(e) =>
                    setValues((v) =>
                      locale === "ar" ? { ...v, bodyAr: e.target.value } : { ...v, bodyEn: e.target.value }
                    )
                  }
                />
              </FormField>
              <FormField label={locale === "ar" ? "نص الزر" : "Button label"}>
                <Input
                  value={locale === "ar" ? values.ctaLabelAr : values.ctaLabelEn}
                  onChange={(e) =>
                    setValues((v) =>
                      locale === "ar" ? { ...v, ctaLabelAr: e.target.value } : { ...v, ctaLabelEn: e.target.value }
                    )
                  }
                />
              </FormField>
            </div>
          )}
        />

        <FormField label="رابط الزر (CTA destination)" hint="مثال: /create-request أو رابط كامل">
          <Input
            dir="ltr"
            value={values.ctaUrl}
            onChange={(e) => setValues((v) => ({ ...v, ctaUrl: e.target.value }))}
          />
        </FormField>

        <div>
          <p className="mb-2 text-sm font-semibold text-text-700">صور الهيرو (Hero Images)</p>
          <p className="mb-3 text-xs text-text-400">
            الصور التي تظهر حول القسم الرئيسي — اختر صورة من مكتبة الوسائط لأي بطاقة، أو اتركها لتبقى الصورة
            الافتراضية الحالية.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {HERO_IMAGE_SLOT_LABELS.map(({ slot, label }) => (
              <FormField key={slot} label={label}>
                <MediaPicker
                  value={values.heroImages[slot]}
                  onChange={(media) =>
                    setValues((v) => ({ ...v, heroImages: { ...v.heroImages, [slot]: media } }))
                  }
                />
              </FormField>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={handleCancel} disabled={isSaving}>
          إلغاء التغييرات
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4" /> {isSaving ? "جارٍ الحفظ..." : "حفظ ونشر"}
        </Button>
      </div>
    </Card>
  );
}

function CategoriesSection() {
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">قسم التصنيفات</h3>
      <p className="text-sm text-text-500">
        محتوى وترتيب التصنيفات المعروضة في الصفحة الرئيسية يُدار من صفحة{" "}
        <a href="/admin/categories" className="font-bold text-teal-600 hover:underline">
          التصنيفات
        </a>{" "}
        مباشرة — لا يوجد تكرار لإدارة نفس البيانات في مكانين مختلفين.
      </p>
    </Card>
  );
}

function CtaSection({ cta }: { cta: MockCtaContent }) {
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">قسم الدعوة لاتخاذ إجراء (CTA)</h3>
      <div className="space-y-4">
        <FormField label="العنوان">
          <Input defaultValue={cta.headingAr} />
        </FormField>
        <FormField label="النص">
          <Textarea rows={2} defaultValue={cta.bodyAr} />
        </FormField>
        <FormField label="نص الزر">
          <Input defaultValue={cta.ctaLabelAr} />
        </FormField>
      </div>
      <SaveBar />
    </Card>
  );
}

function FooterSection({
  footer,
  stats,
  trustBadges,
}: {
  footer: MockFooterContent;
  stats: HomepageStatListItem[];
  trustBadges: TrustBadgeListItem[];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-4 font-display text-lg font-bold text-navy-950">نص التذييل (Footer Statement)</h3>
        <FormField label="الجملة التعريفية بالمنصة">
          <Textarea rows={3} defaultValue={footer.statementAr} />
        </FormField>
        <SaveBar />
      </Card>

      <Card>
        <HomepageStatsManager initialStats={stats} />
      </Card>

      <Card>
        <TrustBadgesManager initialBadges={trustBadges} />
      </Card>
    </div>
  );
}

export default function AdminHomepagePage() {
  const [mockData, setMockData] = useState<Awaited<ReturnType<typeof getMockHomepageContent>> | null>(null);
  const [mainContent, setMainContent] = useState<HomepageMainContentItem | null>(null);
  const [stats, setStats] = useState<HomepageStatListItem[]>([]);
  const [trustBadges, setTrustBadges] = useState<TrustBadgeListItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // CMS nav's "Hero Section" item deep-links here as /admin/homepage?tab=hero
  // instead of duplicating a second Hero management page — see
  // src/config/admin-nav.ts.
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? undefined;

  useEffect(() => {
    Promise.all([
      getMockHomepageContent(),
      getHomepageMainContentAction(),
      listHomepageStatsAction(),
      listTrustBadgesAction(),
    ]).then(([mock, main, statList, badgeList]) => {
      setMockData(mock);
      setMainContent(main);
      setStats(statList);
      setTrustBadges(badgeList);
      setLoaded(true);
    });
  }, []);

  return (
    <div>
      <PageHeader
        title="إدارة الصفحة الرئيسية"
        description="كل ما يظهر في الصفحة الرئيسية قابل للتعديل من هنا — لا يوجد نص ثابت في الكود"
      />

      {!loaded || !mockData ? (
        <Card padded={false}>
          <TableSkeleton rows={5} columns={2} />
        </Card>
      ) : (
        <Tabs
          defaultKey={initialTab}
          items={[
            { key: "logo", label: "الشعار", content: <LogoSection /> },
            { key: "hero", label: "القسم الرئيسي", content: <HeroSection initialContent={mainContent} /> },
            { key: "categories", label: "التصنيفات", content: <CategoriesSection /> },
            { key: "cta", label: "دعوة لاتخاذ إجراء", content: <CtaSection cta={mockData.cta} /> },
            {
              key: "footer",
              label: "التذييل",
              content: <FooterSection footer={mockData.footer} stats={stats} trustBadges={trustBadges} />,
            },
          ]}
        />
      )}
    </div>
  );
}
