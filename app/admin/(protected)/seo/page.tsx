"use client";

import { Save } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Tabs } from "@/components/admin/Tabs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField, Toggle } from "@/components/ui/Field";
import { TranslationTabs } from "@/components/admin/TranslationTabs";

function SaveBar() {
  return (
    <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
      <Button variant="ghost">إلغاء</Button>
      <Button>
        <Save className="h-4 w-4" /> حفظ
      </Button>
    </div>
  );
}

function TitleDescriptionTab() {
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">العنوان والوصف</h3>
      <TranslationTabs
        render={(locale) => (
          <div className="space-y-4">
            <FormField
              label={locale === "ar" ? "عنوان الصفحة (Meta Title)" : "Meta Title"}
              hint="يُفضّل ألا يتجاوز 60 حرفاً"
            >
              <Input defaultValue={locale === "ar" ? "مطلوب — بدل ما تدور، اطلبها" : "Matloob — Request it instead of searching"} />
            </FormField>
            <FormField
              label={locale === "ar" ? "وصف الصفحة (Meta Description)" : "Meta Description"}
              hint="يُفضّل ألا يتجاوز 160 حرفاً"
            >
              <Textarea rows={3} />
            </FormField>
          </div>
        )}
      />
      <SaveBar />
    </Card>
  );
}

function KeywordsTab() {
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">الكلمات المفتاحية</h3>
      <FormField label="الكلمات المفتاحية" hint="افصل بين كل كلمة وأخرى بفاصلة">
        <Textarea rows={3} defaultValue="طلبات, مطلوب, سيارات, عقارات, وظائف, خدمات" />
      </FormField>
      <SaveBar />
    </Card>
  );
}

function OpenGraphTab() {
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">Open Graph (مشاركة السوشيال ميديا)</h3>
      <div className="space-y-4">
        <FormField label="عنوان OG">
          <Input />
        </FormField>
        <FormField label="وصف OG">
          <Textarea rows={2} />
        </FormField>
        <FormField label="صورة OG" hint="المقاس المثالي 1200×630">
          <Button variant="outline" size="sm" type="button">
            اختيار من مكتبة الوسائط
          </Button>
        </FormField>
      </div>
      <SaveBar />
    </Card>
  );
}

function RobotsTab() {
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">Robots</h3>
      <div className="space-y-4">
        <Toggle checked={false} onChange={() => {}} label="منع الفهرسة (noindex) لكامل الموقع" />
        <FormField label="محتوى robots.txt المخصص">
          <Textarea rows={6} dir="ltr" defaultValue={"User-agent: *\nAllow: /\nSitemap: https://matloob.com/sitemap.xml"} />
        </FormField>
      </div>
      <SaveBar />
    </Card>
  );
}

function SitemapTab() {
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">خريطة الموقع (Sitemap)</h3>
      <div className="space-y-4">
        <Toggle checked={true} onChange={() => {}} label="إنشاء خريطة الموقع تلقائياً" />
        <FormField label="رابط Sitemap">
          <Input dir="ltr" defaultValue="https://matloob.com/sitemap.xml" readOnly />
        </FormField>
        <p className="text-xs text-text-400">
          يتم تحديث الخريطة تلقائياً عند نشر طلب جديد أو إضافة تصنيف — لا حاجة لتحديث يدوي.
        </p>
      </div>
    </Card>
  );
}

function SchemaTab() {
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">البيانات المنظمة (Schema.org)</h3>
      <div className="space-y-4">
        <FormField label="نوع الكيان الأساسي">
          <Input defaultValue="Organization" readOnly />
        </FormField>
        <FormField label="JSON-LD مخصص (اختياري)" hint="للمستخدمين المتقدمين فقط">
          <Textarea rows={6} dir="ltr" placeholder='{ "@context": "https://schema.org", ... }' />
        </FormField>
      </div>
      <SaveBar />
    </Card>
  );
}

export default function AdminSeoPage() {
  return (
    <div>
      <PageHeader
        title="إدارة SEO"
        description="إعدادات محركات البحث للصفحة الرئيسية والإعدادات العامة للموقع"
      />
      <Tabs
        items={[
          { key: "title", label: "العنوان والوصف", content: <TitleDescriptionTab /> },
          { key: "keywords", label: "الكلمات المفتاحية", content: <KeywordsTab /> },
          { key: "og", label: "Open Graph", content: <OpenGraphTab /> },
          { key: "robots", label: "Robots", content: <RobotsTab /> },
          { key: "sitemap", label: "Sitemap", content: <SitemapTab /> },
          { key: "schema", label: "Schema", content: <SchemaTab /> },
        ]}
      />
    </div>
  );
}
