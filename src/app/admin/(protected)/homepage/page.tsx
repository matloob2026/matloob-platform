"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ImagePlus, Save } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Tabs } from "@/components/admin/Tabs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField } from "@/components/ui/Field";
import { TranslationTabs } from "@/components/admin/TranslationTabs";
import { TableSkeleton } from "@/components/admin/Skeleton";
import {
  getMockHomepageContent,
  type MockHeroContent,
  type MockCtaContent,
  type MockFooterContent,
  type MockStat,
} from "@/services/mock/homepage-content.mock";

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

function HeroSection({ hero }: { hero: MockHeroContent }) {
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">القسم الرئيسي (Hero)</h3>
      <div className="space-y-4">
        <TranslationTabs
          render={(locale) => (
            <div className="space-y-4">
              <FormField label={locale === "ar" ? "العنوان الرئيسي" : "Headline"}>
                <Input defaultValue={locale === "ar" ? hero.headingAr : hero.headingEn} />
              </FormField>
              <FormField label={locale === "ar" ? "الوصف" : "Description"}>
                <Textarea rows={4} defaultValue={locale === "ar" ? hero.bodyAr : hero.bodyEn} />
              </FormField>
              <FormField label={locale === "ar" ? "نص الزر" : "Button label"}>
                <Input defaultValue={locale === "ar" ? hero.ctaLabelAr : hero.ctaLabelEn} />
              </FormField>
            </div>
          )}
        />

        <div>
          <p className="mb-2 text-sm font-semibold text-text-700">صور الهيرو (Hero Images)</p>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface-muted text-text-400"
              >
                <ImagePlus className="h-5 w-5" />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-text-400">
            8 صور تظهر حول القسم الرئيسي (عقارات، سيارات، جوالات...) — يمكن استبدال كل صورة من مكتبة الوسائط.
          </p>
        </div>
      </div>
      <SaveBar />
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

function FooterSection({ footer, stats }: { footer: MockFooterContent; stats: MockStat[] }) {
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
        <h3 className="mb-4 font-display text-lg font-bold text-navy-950">إحصائيات الصفحة الرئيسية</h3>
        <div className="space-y-3">
          {stats.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Input defaultValue={s.value} className="w-32" dir="ltr" />
              <Input defaultValue={s.labelAr} className="flex-1" />
            </div>
          ))}
        </div>
        <SaveBar />
      </Card>
    </div>
  );
}

export default function AdminHomepagePage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getMockHomepageContent>> | null>(null);
  // CMS nav's "Hero Section" item deep-links here as /admin/homepage?tab=hero
  // instead of duplicating a second Hero management page — see
  // src/config/admin-nav.ts.
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? undefined;

  useEffect(() => {
    getMockHomepageContent().then(setData);
  }, []);

  return (
    <div>
      <PageHeader
        title="إدارة الصفحة الرئيسية"
        description="كل ما يظهر في الصفحة الرئيسية قابل للتعديل من هنا — لا يوجد نص ثابت في الكود"
      />

      {!data ? (
        <Card padded={false}>
          <TableSkeleton rows={5} columns={2} />
        </Card>
      ) : (
        <Tabs
          defaultKey={initialTab}
          items={[
            { key: "logo", label: "الشعار", content: <LogoSection /> },
            { key: "hero", label: "القسم الرئيسي", content: <HeroSection hero={data.hero} /> },
            { key: "categories", label: "التصنيفات", content: <CategoriesSection /> },
            { key: "cta", label: "دعوة لاتخاذ إجراء", content: <CtaSection cta={data.cta} /> },
            {
              key: "footer",
              label: "التذييل",
              content: <FooterSection footer={data.footer} stats={data.stats} />,
            },
          ]}
        />
      )}
    </div>
  );
}
