"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Tabs } from "@/components/admin/Tabs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, FormField, Toggle } from "@/components/ui/Field";
import { useToast } from "@/components/ui/ToastProvider";
import type { AllSiteSettings } from "@/services/admin/site-settings.service";
import { saveSettingsGroupAction } from "./actions";

/**
 * Global Site Settings — one focused screen covering exactly the four
 * groups this task specifies (brand/identity, contact, social,
 * public-site behavior), reusing the existing SiteSetting model (see
 * src/services/admin/site-settings.service.ts). Replaces the
 * Checkpoint 01 mock screen, which had several speculative tabs
 * (email provider, brand colors, social-auth toggles, "future
 * integrations") that don't correspond to anything this task asks
 * for — deliberately not carried over, per "do not invent dozens of
 * meaningless settings".
 */
function GroupSaveBar({ isSaving, onSave, onReset }: { isSaving: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
      <Button variant="ghost" onClick={onReset} disabled={isSaving}>
        إلغاء التغييرات
      </Button>
      <Button onClick={onSave} disabled={isSaving}>
        <Save className="h-4 w-4" /> {isSaving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
      </Button>
    </div>
  );
}

function useGroupForm<G extends keyof AllSiteSettings>(group: G, initial: AllSiteSettings[G]) {
  const router = useRouter();
  const { showToast } = useToast();
  const [values, setValues] = useState<AllSiteSettings[G]>(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function save() {
    setError(undefined);
    startTransition(async () => {
      const result = await saveSettingsGroupAction(group, values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      showToast("تم حفظ الإعدادات بنجاح.", "success");
      router.refresh();
    });
  }

  function reset() {
    setValues(initial);
    setError(undefined);
  }

  return { values, setValues, isPending, error, save, reset };
}

function BrandTab({ initial }: { initial: AllSiteSettings["brand"] }) {
  const { values, setValues, isPending, error, save, reset } = useGroupForm("brand", initial);
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">الهوية والعلامة التجارية</h3>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="اسم المنصة (عربي)">
          <Input value={values.siteNameAr} onChange={(e) => setValues((v) => ({ ...v, siteNameAr: e.target.value }))} />
        </FormField>
        <FormField label="Site name (English)">
          <Input
            dir="ltr"
            value={values.siteNameEn}
            onChange={(e) => setValues((v) => ({ ...v, siteNameEn: e.target.value }))}
          />
        </FormField>
        <FormField label="الوصف المختصر (عربي)">
          <Input value={values.taglineAr} onChange={(e) => setValues((v) => ({ ...v, taglineAr: e.target.value }))} />
        </FormField>
        <FormField label="Tagline (English)">
          <Input
            dir="ltr"
            value={values.taglineEn}
            onChange={(e) => setValues((v) => ({ ...v, taglineEn: e.target.value }))}
          />
        </FormField>
        <FormField label="رابط الشعار (Logo URL)" hint="اترك فارغاً لاستخدام الشعار الحالي">
          <Input
            dir="ltr"
            placeholder="https://..."
            value={values.logoUrl}
            onChange={(e) => setValues((v) => ({ ...v, logoUrl: e.target.value }))}
          />
        </FormField>
        <FormField label="رابط أيقونة الموقع (Favicon URL)">
          <Input
            dir="ltr"
            placeholder="https://..."
            value={values.faviconUrl}
            onChange={(e) => setValues((v) => ({ ...v, faviconUrl: e.target.value }))}
          />
        </FormField>
        <FormField label="لغة الموقع الافتراضية">
          <Select
            value={values.defaultLocale}
            onChange={(e) => setValues((v) => ({ ...v, defaultLocale: e.target.value as "ar" | "en" }))}
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </Select>
        </FormField>
      </div>
      <GroupSaveBar isSaving={isPending} onSave={save} onReset={reset} />
    </Card>
  );
}

function ContactTab({ initial }: { initial: AllSiteSettings["contact"] }) {
  const { values, setValues, isPending, error, save, reset } = useGroupForm("contact", initial);
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">التواصل</h3>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="البريد الإلكتروني للتواصل">
          <Input
            type="email"
            dir="ltr"
            placeholder="info@matloob.com"
            value={values.contactEmail}
            onChange={(e) => setValues((v) => ({ ...v, contactEmail: e.target.value }))}
          />
        </FormField>
        <FormField label="البريد الإلكتروني للدعم">
          <Input
            type="email"
            dir="ltr"
            placeholder="support@matloob.com"
            value={values.supportEmail}
            onChange={(e) => setValues((v) => ({ ...v, supportEmail: e.target.value }))}
          />
        </FormField>
        <FormField label="رقم الهاتف">
          <Input
            dir="ltr"
            placeholder="+966 5X XXX XXXX"
            value={values.contactPhone}
            onChange={(e) => setValues((v) => ({ ...v, contactPhone: e.target.value }))}
          />
        </FormField>
        <FormField label="رقم واتساب">
          <Input
            dir="ltr"
            placeholder="+966 5X XXX XXXX"
            value={values.whatsappNumber}
            onChange={(e) => setValues((v) => ({ ...v, whatsappNumber: e.target.value }))}
          />
        </FormField>
        <FormField label="العنوان">
          <Textarea
            rows={2}
            value={values.address}
            onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
          />
        </FormField>
      </div>
      <GroupSaveBar isSaving={isPending} onSave={save} onReset={reset} />
    </Card>
  );
}

const SOCIAL_LABELS: Record<keyof AllSiteSettings["social"], string> = {
  facebook: "فيسبوك",
  instagram: "إنستغرام",
  tiktok: "تيك توك",
  x: "إكس (تويتر)",
  linkedin: "لينكدإن",
  youtube: "يوتيوب",
};

function SocialTab({ initial }: { initial: AllSiteSettings["social"] }) {
  const { values, setValues, isPending, error, save, reset } = useGroupForm("social", initial);
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">روابط التواصل الاجتماعي</h3>
      <p className="mb-4 text-sm text-text-500">
        رابطا إكس وإنستغرام يظهران فعلياً في تذييل الصفحة الرئيسية. باقي الروابط محفوظة للاستخدام المستقبلي.
      </p>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
      <div className="space-y-3">
        {(Object.keys(SOCIAL_LABELS) as (keyof AllSiteSettings["social"])[]).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-28 flex-shrink-0 text-sm font-semibold text-text-700">{SOCIAL_LABELS[key]}</span>
            <Input
              dir="ltr"
              placeholder="https://"
              className="flex-1"
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <GroupSaveBar isSaving={isPending} onSave={save} onReset={reset} />
    </Card>
  );
}

function BehaviorTab({ initial }: { initial: AllSiteSettings["behavior"] }) {
  const { values, setValues, isPending, error, save, reset } = useGroupForm("behavior", initial);
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">إعدادات الموقع</h3>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
      <div className="space-y-4">
        <Toggle
          checked={values.maintenanceMode}
          onChange={(value) => setValues((v) => ({ ...v, maintenanceMode: value }))}
          label="تفعيل وضع الصيانة (يعرض إشعار صيانة بدلاً من الصفحة الرئيسية)"
        />
        <FormField label="عدد العناصر لكل صفحة (الوضع الافتراضي)" hint="يُستخدم كقيمة افتراضية لقوائم لوحة التحكم">
          <Input
            type="number"
            dir="ltr"
            className="w-32"
            value={values.defaultPageSize}
            onChange={(e) => setValues((v) => ({ ...v, defaultPageSize: Number(e.target.value) || 0 }))}
          />
        </FormField>
      </div>
      <GroupSaveBar isSaving={isPending} onSave={save} onReset={reset} />
    </Card>
  );
}

/** Administration module: company/legal details — distinct from the
 * "Contact" tab (how visitors REACH the business) and "Brand"
 * (public-facing name). Nothing in the codebase reads these back out
 * yet; purely informational and safe to leave blank. */
function CompanyTab({ initial }: { initial: AllSiteSettings["company"] }) {
  const { values, setValues, isPending, error, save, reset } = useGroupForm("company", initial);
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">الشركة</h3>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="الاسم القانوني للشركة">
          <Input value={values.legalName} onChange={(e) => setValues((v) => ({ ...v, legalName: e.target.value }))} />
        </FormField>
        <FormField label="رقم السجل التجاري">
          <Input
            dir="ltr"
            value={values.registrationNumber}
            onChange={(e) => setValues((v) => ({ ...v, registrationNumber: e.target.value }))}
          />
        </FormField>
        <FormField label="الرقم الضريبي">
          <Input dir="ltr" value={values.taxNumber} onChange={(e) => setValues((v) => ({ ...v, taxNumber: e.target.value }))} />
        </FormField>
      </div>
      <GroupSaveBar isSaving={isPending} onSave={save} onReset={reset} />
    </Card>
  );
}

/** Administration module: the one genuinely safe, admin-only security
 * knob — how long an admin session stays valid before requiring
 * re-login (see src/auth/tokens.ts's `generateAdminSessionToken`).
 * The end-user-facing password-length policy deliberately stays a
 * code constant (`MIN_PASSWORD_LENGTH` in src/auth/password.ts) since
 * it affects the whole user base, not just admin accounts. */
function SecurityTab({ initial }: { initial: AllSiteSettings["security"] }) {
  const { values, setValues, isPending, error, save, reset } = useGroupForm("security", initial);
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">الأمان</h3>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}
      <div className="space-y-4">
        <FormField
          label="مدة صلاحية جلسة تسجيل الدخول (بالساعات)"
          hint="بعد انتهاء هذه المدة، سيحتاج المشرف لتسجيل الدخول مرة أخرى"
        >
          <Input
            type="number"
            dir="ltr"
            className="w-32"
            min={1}
            max={72}
            value={values.sessionTimeoutHours}
            onChange={(e) => setValues((v) => ({ ...v, sessionTimeoutHours: Number(e.target.value) || 8 }))}
          />
        </FormField>
      </div>
      <GroupSaveBar isSaving={isPending} onSave={save} onReset={reset} />
    </Card>
  );
}

/** Administration module: read-only status for Email/Upload/Storage —
 * these stay environment-variable/code-constant configuration
 * (RESEND_API_KEY/RESEND_FROM_EMAIL, MAX_IMAGE_BYTES,
 * ALLOWED_MIME_TYPES) rather than live-editable database settings,
 * since they're shared by end-user-facing flows (every password reset
 * email, every image upload site-wide) — a mistake in a
 * database-driven version would break live user functionality, not
 * just an admin screen. This tab surfaces their CURRENT status for
 * visibility without offering to edit them here. */
function IntegrationsStatusTab({
  emailConfigured,
  emailFromAddress,
  maxUploadMb,
  allowedUploadTypes,
}: {
  emailConfigured: boolean;
  emailFromAddress: string | null;
  maxUploadMb: number;
  allowedUploadTypes: string;
}) {
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">البريد الإلكتروني والرفع والتخزين</h3>
      <p className="mb-4 text-sm text-text-500">
        هذه الإعدادات تُدار حالياً عبر متغيرات البيئة (Environment Variables) في الخادم لأنها تؤثر مباشرة على
        وظائف حساسة يستخدمها كل المستخدمين (رسائل إعادة تعيين كلمة المرور، رفع كل الصور في المنصة) — لذلك تُعرض هنا
        للاطلاع فقط دون إمكانية التعديل من هذه الشاشة.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-text-400">مزوّد البريد الإلكتروني</p>
          <p className="mt-1 font-bold text-navy-950">{emailConfigured ? "مُفعّل" : "غير مُفعّل"}</p>
          {emailFromAddress && (
            <p className="mt-1 text-xs text-text-400" dir="ltr">
              {emailFromAddress}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs text-text-400">الحد الأقصى لحجم الصورة</p>
          <p className="mt-1 font-bold text-navy-950">{maxUploadMb} ميغابايت</p>
        </div>
        <div className="rounded-lg border border-border p-4 sm:col-span-2">
          <p className="text-xs text-text-400">أنواع الصور المسموح رفعها</p>
          <p className="mt-1 font-bold text-navy-950" dir="ltr">
            {allowedUploadTypes}
          </p>
        </div>
      </div>
    </Card>
  );
}

export function SettingsManager({
  initialSettings,
  integrationsStatus,
}: {
  initialSettings: AllSiteSettings;
  integrationsStatus: {
    emailConfigured: boolean;
    emailFromAddress: string | null;
    maxUploadMb: number;
    allowedUploadTypes: string;
  };
}) {
  return (
    <Tabs
      items={[
        { key: "brand", label: "الهوية والعلامة التجارية", content: <BrandTab initial={initialSettings.brand} /> },
        { key: "contact", label: "التواصل", content: <ContactTab initial={initialSettings.contact} /> },
        { key: "social", label: "روابط التواصل الاجتماعي", content: <SocialTab initial={initialSettings.social} /> },
        { key: "behavior", label: "إعدادات الموقع", content: <BehaviorTab initial={initialSettings.behavior} /> },
        { key: "company", label: "الشركة", content: <CompanyTab initial={initialSettings.company} /> },
        { key: "security", label: "الأمان", content: <SecurityTab initial={initialSettings.security} /> },
        {
          key: "integrations",
          label: "البريد والرفع والتخزين",
          content: <IntegrationsStatusTab {...integrationsStatus} />,
        },
      ]}
    />
  );
}
