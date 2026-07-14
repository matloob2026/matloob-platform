"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, FormField } from "@/components/ui/Field";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import type { LocationOptions } from "@/lib/profile-location-options";

export interface ProfileFormValues {
  displayName: string;
  contactPhone: string;
  cityId: string;
  bio: string;
  preferredContactMethod: string;
}

const CONTACT_METHOD_LABELS: Record<string, string> = {
  EMAIL: "البريد الإلكتروني",
  PHONE: "الهاتف",
  WHATSAPP: "واتساب",
};

export function ProfileForm({
  initialValues,
  locationOptions,
}: {
  initialValues: ProfileFormValues;
  locationOptions: LocationOptions;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileFormValues>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: values.displayName,
          contactPhone: values.contactPhone || null,
          cityId: values.cityId || null,
          bio: values.bio || null,
          preferredContactMethod: values.preferredContactMethod || null,
        }),
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.error.message : "تعذر حفظ التغييرات.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSave} dir="rtl" className="mt-6 space-y-5 text-right">
      {error && (
        <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">{error}</p>
      )}
      {saved && (
        <p className="flex items-center gap-1 rounded-lg bg-teal-50 px-3.5 py-2.5 text-sm font-semibold text-teal-700">
          <span aria-hidden="true">✓</span> تم حفظ التغييرات بنجاح
        </p>
      )}

      <FormField label="الاسم الظاهر">
        <Input
          value={values.displayName}
          onChange={(e) => update("displayName", e.target.value)}
          minLength={2}
          maxLength={80}
        />
      </FormField>

      <FormField label="رقم الهاتف (اختياري)">
        <Input
          type="tel"
          value={values.contactPhone}
          onChange={(e) => update("contactPhone", e.target.value)}
          placeholder="+966 5xxxxxxxx"
        />
      </FormField>

      <FormField label="المدينة (اختياري)">
        <Select value={values.cityId} onChange={(e) => update("cityId", e.target.value)}>
          <option value="">بدون تحديد</option>
          {locationOptions.cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="نبذة عني (اختياري)">
        <Textarea
          value={values.bio}
          onChange={(e) => update("bio", e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="اكتب نبذة قصيرة عنك..."
        />
      </FormField>

      <FormField label="وسيلة التواصل المفضلة (اختياري)">
        <Select
          value={values.preferredContactMethod}
          onChange={(e) => update("preferredContactMethod", e.target.value)}
        >
          <option value="">بدون تحديد</option>
          {Object.entries(CONTACT_METHOD_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </FormField>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "جارٍ الحفظ..." : "حفظ التغييرات"}
      </Button>
    </form>
  );
}
