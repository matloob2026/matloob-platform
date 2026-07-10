"use client";

import { Save, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Tabs } from "@/components/admin/Tabs";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, FormField, Toggle } from "@/components/ui/Field";

function SaveBar() {
  return (
    <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
      <Button variant="ghost">إلغاء</Button>
      <Button>
        <Save className="h-4 w-4" /> حفظ التغييرات
      </Button>
    </div>
  );
}

function GeneralTab() {
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">عام</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="اسم المنصة">
          <Input defaultValue="مطلوب" />
        </FormField>
        <FormField label="شعار المنصة (Tagline)">
          <Input defaultValue="بدل ما تدور... اطلبها" />
        </FormField>
        <FormField label="المنطقة الزمنية">
          <Select defaultValue="Asia/Riyadh">
            <option value="Asia/Riyadh">آسيا/الرياض (GMT+3)</option>
            <option value="Africa/Cairo">أفريقيا/القاهرة (GMT+2)</option>
          </Select>
        </FormField>
        <FormField label="وضع الصيانة">
          <div className="pt-2">
            <Toggle checked={false} onChange={() => {}} label="تفعيل وضع الصيانة" />
          </div>
        </FormField>
      </div>
      <SaveBar />
    </Card>
  );
}

function LocalizationTab() {
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">التوطين الافتراضي</h3>
      <p className="mb-4 text-sm text-text-500">
        إدارة الدول والمدن الكاملة متاحة من صفحة{" "}
        <a href="/admin/localization" className="font-bold text-teal-600 hover:underline">
          المدن والدول
        </a>
        . هذه فقط القيم الافتراضية العامة للمنصة.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="الدولة الافتراضية">
          <Select defaultValue="SA">
            <option value="SA">المملكة العربية السعودية</option>
            <option value="EG">مصر</option>
          </Select>
        </FormField>
        <FormField label="اللغة الافتراضية">
          <Select defaultValue="ar">
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </Select>
        </FormField>
        <FormField label="العملة الافتراضية">
          <Select defaultValue="SAR">
            <option value="SAR">ريال سعودي (SAR)</option>
            <option value="EGP">جنيه مصري (EGP)</option>
          </Select>
        </FormField>
        <FormField label="اتجاه الواجهة الافتراضي">
          <Select defaultValue="rtl">
            <option value="rtl">من اليمين لليسار (RTL)</option>
            <option value="ltr">من اليسار لليمين (LTR)</option>
          </Select>
        </FormField>
      </div>
      <SaveBar />
    </Card>
  );
}

function SocialTab() {
  const platforms = ["تويتر (X)", "إنستغرام", "سناب شات", "تيك توك"];
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">روابط التواصل الاجتماعي</h3>
      <div className="space-y-3">
        {platforms.map((p) => (
          <div key={p} className="flex items-center gap-3">
            <span className="w-28 flex-shrink-0 text-sm font-semibold text-text-700">{p}</span>
            <Input dir="ltr" placeholder="https://" className="flex-1" />
            <button className="rounded-lg p-2 text-text-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Button variant="outline" size="sm" type="button">
          <Plus className="h-4 w-4" /> إضافة منصة أخرى
        </Button>
      </div>
      <SaveBar />
    </Card>
  );
}

function ContactTab() {
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">معلومات التواصل</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="البريد الإلكتروني للدعم">
          <Input type="email" dir="ltr" placeholder="support@matloob.com" />
        </FormField>
        <FormField label="رقم الجوال / واتساب">
          <Input dir="ltr" placeholder="+966 5X XXX XXXX" />
        </FormField>
        <FormField label="العنوان">
          <Input />
        </FormField>
        <FormField label="ساعات الدعم">
          <Input defaultValue="السبت - الخميس، 9ص - 9م" />
        </FormField>
      </div>
      <SaveBar />
    </Card>
  );
}

function EmailTab() {
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">إعدادات البريد الإلكتروني</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="اسم المرسل">
          <Input defaultValue="فريق مطلوب" />
        </FormField>
        <FormField label="بريد المرسل">
          <Input dir="ltr" placeholder="no-reply@matloob.com" />
        </FormField>
        <FormField label="مزوّد خدمة البريد">
          <Select>
            <option>SendGrid</option>
            <option>Postmark</option>
            <option>Amazon SES</option>
          </Select>
        </FormField>
        <FormField label="مفتاح API" hint="يُخزَّن بشكل مشفّر — لن يُعرض بعد الحفظ">
          <Input type="password" dir="ltr" placeholder="••••••••••••" />
        </FormField>
      </div>
      <SaveBar />
    </Card>
  );
}

function BrandingTab() {
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">الهوية البصرية</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="اللون الأساسي (Navy)">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg border border-border" style={{ background: "#163A6B" }} />
            <Input defaultValue="#163A6B" dir="ltr" />
          </div>
        </FormField>
        <FormField label="اللون الثانوي (Teal)">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg border border-border" style={{ background: "#0C93A8" }} />
            <Input defaultValue="#0C93A8" dir="ltr" />
          </div>
        </FormField>
        <FormField label="الشعار (Logo)">
          <Button variant="outline" size="sm" type="button">اختيار من مكتبة الوسائط</Button>
        </FormField>
        <FormField label="أيقونة الموقع (Favicon)">
          <Button variant="outline" size="sm" type="button">اختيار من مكتبة الوسائط</Button>
        </FormField>
      </div>
      <SaveBar />
    </Card>
  );
}

function SystemTab() {
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">إعدادات النظام</h3>
      <div className="space-y-4">
        <Toggle checked={true} onChange={() => {}} label="تفعيل التسجيل بحساب جوجل" />
        <Toggle checked={false} onChange={() => {}} label="تفعيل التسجيل بحساب آبل" />
        <Toggle checked={true} onChange={() => {}} label="مطالبة المستخدمين بتفعيل البريد الإلكتروني" />
        <Toggle checked={true} onChange={() => {}} label="مطالبة الموردين بتوثيق الهوية" />
        <FormField label="مدة انتهاء الطلب الافتراضية (بالأيام)">
          <Input type="number" defaultValue={30} className="w-32" />
        </FormField>
      </div>
      <SaveBar />
    </Card>
  );
}

function FutureIntegrationsTab() {
  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold text-navy-950">تكاملات مستقبلية</h3>
      <p className="mb-4 text-sm text-text-500">
        هذا القسم محجوز لتكاملات لاحقة (بوابات الدفع، خدمات الرسائل النصية، تحليلات الأداء) — لا
        يتطلب أي تعديل في البنية البرمجية الحالية عند التفعيل.
      </p>
      <div className="space-y-3">
        {["بوابة الدفع", "خدمة الرسائل النصية (SMS)", "تحليلات Google Analytics", "Facebook Pixel"].map(
          (name) => (
            <div key={name} className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm font-semibold text-text-700">{name}</span>
              <Toggle checked={false} onChange={() => {}} label="قريباً" />
            </div>
          )
        )}
      </div>
    </Card>
  );
}

export default function AdminSettingsPage() {
  return (
    <div>
      <PageHeader title="الإعدادات" description="الإعدادات العامة للمنصة" />
      <Tabs
        items={[
          { key: "general", label: "عام", content: <GeneralTab /> },
          { key: "localization", label: "التوطين", content: <LocalizationTab /> },
          { key: "social", label: "التواصل الاجتماعي", content: <SocialTab /> },
          { key: "contact", label: "معلومات التواصل", content: <ContactTab /> },
          { key: "email", label: "البريد الإلكتروني", content: <EmailTab /> },
          { key: "branding", label: "الهوية البصرية", content: <BrandingTab /> },
          { key: "system", label: "النظام", content: <SystemTab /> },
          { key: "future", label: "تكاملات مستقبلية", content: <FutureIntegrationsTab /> },
        ]}
      />
    </div>
  );
}
