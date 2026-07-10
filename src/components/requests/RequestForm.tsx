"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, FormField } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import type { RequestDetail } from "@/types/domain";
import type { RequestFormOptions } from "@/lib/request-form-options";

export interface RequestFormValues {
  categoryId: string;
  countryId: string;
  cityId: string;
  currencyId: string;
  title: string;
  description: string;
  budgetMin: string;
  budgetMax: string;
}

interface RequestFormProps {
  mode: "create" | "edit";
  requestId?: string;
  options: RequestFormOptions;
  initialValues?: Partial<RequestFormValues>;
}

const EMPTY_VALUES: RequestFormValues = {
  categoryId: "",
  countryId: "",
  cityId: "",
  currencyId: "",
  title: "",
  description: "",
  budgetMin: "",
  budgetMax: "",
};

export function RequestForm({ mode, requestId, options, initialValues }: RequestFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<RequestFormValues>({ ...EMPTY_VALUES, ...initialValues });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const citiesForCountry = useMemo(
    () => options.cities.filter((c) => c.countryId === values.countryId),
    [options.cities, values.countryId]
  );

  function update<K extends keyof RequestFormValues>(key: K, value: RequestFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const budgetMin = values.budgetMin.trim() ? Number(values.budgetMin) : undefined;
    const budgetMax = values.budgetMax.trim() ? Number(values.budgetMax) : undefined;

    try {
      if (mode === "create") {
        const { data } = await apiFetch<{ data: RequestDetail }>("/api/requests", {
          method: "POST",
          body: JSON.stringify({
            categoryId: values.categoryId,
            countryId: values.countryId,
            cityId: values.cityId || undefined,
            currencyId: values.currencyId || undefined,
            title: values.title,
            description: values.description,
            budgetMin,
            budgetMax,
          }),
        });
        router.push(`/requests/${data.id}`);
      } else {
        const { data } = await apiFetch<{ data: RequestDetail }>(`/api/requests/${requestId}`, {
          method: "PATCH",
          body: JSON.stringify({
            categoryId: values.categoryId,
            cityId: values.cityId || undefined,
            currencyId: values.currencyId || undefined,
            title: values.title,
            description: values.description,
            budgetMin: budgetMin ?? null,
            budgetMax: budgetMax ?? null,
          }),
        });
        router.push(`/requests/${data.id}`);
      }
      router.refresh();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setFormError(err.error.message);
        if (err.error.details) {
          setFieldErrors(err.error.details as Record<string, string[]>);
        }
      } else {
        setFormError("حدث خطأ غير متوقع. حاول مرة أخرى.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
        {formError && (
          <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">
            {formError}
          </p>
        )}

        <FormField label="عنوان الطلب">
          <Input
            value={values.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="مثال: أحتاج مصمم داخلي لشقة في الرياض"
            required
            minLength={5}
            maxLength={120}
          />
          {fieldErrors.title && <p className="mt-1 text-xs text-red-600">{fieldErrors.title[0]}</p>}
        </FormField>

        <FormField label="وصف الطلب">
          <Textarea
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="اشرح تفاصيل ما تحتاجه بالضبط..."
            required
            minLength={20}
            maxLength={4000}
            rows={5}
          />
          {fieldErrors.description && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.description[0]}</p>
          )}
        </FormField>

        <FormField label="التصنيف">
          <Select
            value={values.categoryId}
            onChange={(e) => update("categoryId", e.target.value)}
            required
          >
            <option value="">اختر التصنيف</option>
            {options.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>

        {mode === "create" && (
          <FormField label="الدولة">
            <Select
              value={values.countryId}
              onChange={(e) => {
                update("countryId", e.target.value);
                update("cityId", "");
              }}
              required
            >
              <option value="">اختر الدولة</option>
              {options.countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <FormField label="المدينة (اختياري)">
          <Select value={values.cityId} onChange={(e) => update("cityId", e.target.value)}>
            <option value="">بدون تحديد</option>
            {citiesForCountry.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="الحد الأدنى للميزانية (اختياري)">
            <Input
              type="number"
              min={0}
              value={values.budgetMin}
              onChange={(e) => update("budgetMin", e.target.value)}
            />
          </FormField>
          <FormField label="الحد الأقصى للميزانية (اختياري)">
            <Input
              type="number"
              min={0}
              value={values.budgetMax}
              onChange={(e) => update("budgetMax", e.target.value)}
            />
          </FormField>
        </div>

        <FormField label="العملة (اختياري)">
          <Select value={values.currencyId} onChange={(e) => update("currencyId", e.target.value)}>
            <option value="">بدون تحديد</option>
            {options.currencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} ({c.symbol})
              </option>
            ))}
          </Select>
        </FormField>

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? "جارٍ الحفظ..."
            : mode === "create"
              ? "انشر طلبك الآن"
              : "حفظ التعديلات"}
        </Button>
      </form>
    </Card>
  );
}
