"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Tabs } from "@/components/admin/Tabs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, FormField, Toggle } from "@/components/ui/Field";
import { TranslationTabs } from "@/components/admin/TranslationTabs";
import { useToast } from "@/components/ui/ToastProvider";
import type { SeoFields, UpdateSeoFields } from "@/services/admin/seo.service";
import type { SeoGlobalSettings } from "@/services/admin/site-settings.service";
import { saveEntitySeoAction, saveSeoGlobalSettingsAction } from "./actions";

/**
 * SEO CMS — real, database-backed. "Global SEO" and "Homepage SEO"
 * both edit `SeoSetting` rows (entityType "global"/"homepage",
 * entityId null — see src/services/admin/seo.service.ts); "Technical
 * SEO" edits the `SiteSetting` "seo" group (keywords/robots.txt
 * override/schema.org JSON-LD). Open Graph reuses the same title/
 * description fields — see seo.service.ts's docstring for why there's
 * no separate OG column in the schema. Static Page SEO is edited
 * inline in src/app/admin/(protected)/pages/StaticPagesManager.tsx,
 * not here — this screen only covers the two entities inherently
 * singular for the platform (global defaults, the one homepage).
 */

function SaveBar({ isSaving, onSave }: { isSaving: boolean; onSave: () => void }) {
  return (
    <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
      <Button onClick={onSave} disabled={isSaving}>
        <Save className="h-4 w-4" /> {isSaving ? "جارٍ الحفظ..." : "حفظ"}
      </Button>
    </div>
  );
}

function EntitySeoForm({
  entityType,
  entityId,
  initial,
  title,
  description,
}: {
  entityType: string;
  entityId: string | null;
  initial: { ar: SeoFields; en: SeoFields };
  title: string;
  description: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [values, setValues] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function update(locale: "ar" | "en", patch: UpdateSeoFields) {
    setValues((v) => ({ ...v, [locale]: { ...v[locale], ...patch } }));
  }

  function save() {
    setError(undefined);
    startTransition(async () => {
      const result = await saveEntitySeoAction(entityType, entityId, values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      showToast("تم حفظ إعدادات SEO بنجاح.", "success");
      router.refresh();
    });
  }

  return (
    <Card>
      <h3 className="mb-1 font-display text-lg font-bold text-navy-950">{title}</h3>
      <p className="mb-4 text-sm text-text-500">{description}</p>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
      <TranslationTabs
        render={(locale) => {
          const fields = values[locale];
          return (
            <div className="space-y-4">
              <FormField
                label={locale === "ar" ? "عنوان الصفحة (Meta Title)" : "Meta Title"}
                hint="يُستخدم أيضاً كعنوان Open Graph — يُفضّل ألا يتجاوز 60 حرفاً"
              >
                <Input value={fields.metaTitle} onChange={(e) => update(locale, { metaTitle: e.target.value })} />
              </FormField>
              <FormField
                label={locale === "ar" ? "وصف الصفحة (Meta Description)" : "Meta Description"}
                hint="يُستخدم أيضاً كوصف Open Graph — يُفضّل ألا يتجاوز 160 حرفاً"
              >
                <Textarea rows={3} value={fields.metaDescription} onChange={(e) => update(locale, { metaDescription: e.target.value })} />
              </FormField>
              <FormField label="الرابط الأساسي (Canonical URL)">
                <Input
                  dir="ltr"
                  placeholder="https://matloob.com/..."
                  value={fields.canonicalUrl}
                  onChange={(e) => update(locale, { canonicalUrl: e.target.value })}
                />
              </FormField>
              <Toggle
                checked={fields.noIndex}
                onChange={(value) => update(locale, { noIndex: value })}
                label="منع الفهرسة (noindex) لهذه الصفحة"
              />
            </div>
          );
        }}
      />
      <SaveBar isSaving={isPending} onSave={save} />
    </Card>
  );
}

function TechnicalSeoTab({ initial }: { initial: SeoGlobalSettings }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [values, setValues] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function save() {
    setError(undefined);
    startTransition(async () => {
      const result = await saveSeoGlobalSettingsAction(values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      showToast("تم حفظ الإعدادات التقنية بنجاح.", "success");
      router.refresh();
    });
  }

  return (
    <Card>
      <h3 className="mb-1 font-display text-lg font-bold text-navy-950">إعدادات تقنية SEO</h3>
      <p className="mb-4 text-sm text-text-500">
        تُقرأ هذه القيم مباشرة من ‎/robots.txt‎ و‎/sitemap.xml‎ والصفحة الرئيسية — لا حاجة لأي تعديل برمجي.
      </p>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
      <div className="space-y-4">
        <FormField label="الكلمات المفتاحية الافتراضية" hint="افصل بين كل كلمة وأخرى بفاصلة">
          <Textarea
            rows={3}
            value={values.defaultKeywords}
            onChange={(e) => setValues((v) => ({ ...v, defaultKeywords: e.target.value }))}
          />
        </FormField>
        <FormField
          label="محتوى robots.txt المخصص (اختياري)"
          hint="اتركه فارغاً لاستخدام الإعداد الافتراضي الآمن (يسمح بكل شيء ويشير لخريطة الموقع)"
        >
          <Textarea
            rows={5}
            dir="ltr"
            placeholder={"User-agent: *\nAllow: /"}
            value={values.robotsTxtCustom}
            onChange={(e) => setValues((v) => ({ ...v, robotsTxtCustom: e.target.value }))}
          />
        </FormField>
        <FormField label="JSON-LD مخصص (اختياري)" hint="بيانات Schema.org منظمة — للمستخدمين المتقدمين فقط">
          <Textarea
            rows={5}
            dir="ltr"
            placeholder='{ "@context": "https://schema.org", ... }'
            value={values.schemaJsonLd}
            onChange={(e) => setValues((v) => ({ ...v, schemaJsonLd: e.target.value }))}
          />
        </FormField>
      </div>
      <SaveBar isSaving={isPending} onSave={save} />
    </Card>
  );
}

export function SeoManager({
  globalSeo,
  homepageSeo,
  seoGlobalSettings,
}: {
  globalSeo: { ar: SeoFields; en: SeoFields };
  homepageSeo: { ar: SeoFields; en: SeoFields };
  seoGlobalSettings: SeoGlobalSettings;
}) {
  return (
    <Tabs
      items={[
        {
          key: "global",
          label: "SEO العام",
          content: (
            <EntitySeoForm
              entityType="global"
              entityId={null}
              initial={globalSeo}
              title="إعدادات SEO العامة (الافتراضية)"
              description="تُستخدم لأي صفحة لا تملك إعدادات SEO خاصة بها — آخر مستوى قبل القيم الافتراضية الآمنة."
            />
          ),
        },
        {
          key: "homepage",
          label: "SEO الصفحة الرئيسية",
          content: (
            <EntitySeoForm
              entityType="homepage"
              entityId={null}
              initial={homepageSeo}
              title="إعدادات SEO للصفحة الرئيسية"
              description="تُطبَّق على الصفحة الرئيسية تحديداً، وتتقدم على الإعدادات العامة."
            />
          ),
        },
        { key: "technical", label: "إعدادات تقنية SEO", content: <TechnicalSeoTab initial={seoGlobalSettings} /> },
      ]}
    />
  );
}
