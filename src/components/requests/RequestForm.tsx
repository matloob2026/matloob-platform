"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, FormField } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { ImageDropzone, type StagedImage } from "@/components/media/ImageDropzone";
import type { RequestDetail } from "@/types/domain";
import type { RequestFormOptions } from "@/lib/request-form-options";

export interface RequestFormValues {
  categoryId: string;
  cityId: string;
  title: string;
  description: string;
  budgetMin: string;
  budgetMax: string;
  /** Requests polish pass: Country/Currency were removed from this
   * form (the request now only depends on the chosen city — the
   * server derives the country from it); this replaces them with
   * optional contact info, each with its own public-visibility
   * toggle. */
  contactPhone: string;
  contactPhoneVisible: boolean;
  contactWhatsapp: string;
  contactWhatsappVisible: boolean;
  contactEmail: string;
  contactEmailVisible: boolean;
}

interface RequestFormProps {
  mode: "create" | "edit";
  requestId?: string;
  options: RequestFormOptions;
  initialValues?: Partial<RequestFormValues>;
}

const EMPTY_VALUES: RequestFormValues = {
  categoryId: "",
  cityId: "",
  title: "",
  description: "",
  budgetMin: "",
  budgetMax: "",
  contactPhone: "",
  contactPhoneVisible: false,
  contactWhatsapp: "",
  contactWhatsappVisible: false,
  contactEmail: "",
  contactEmailVisible: false,
};

export function RequestForm({ mode, requestId, options, initialValues }: RequestFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<RequestFormValues>({ ...EMPTY_VALUES, ...initialValues });
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [justPublished, setJustPublished] = useState(false);

  // Categories module completion: group the category dropdown by
  // parent using native <optgroup> (no custom dropdown component, no
  // redesign) and preview the selected category's uploaded icon next
  // to the select.
  const categoryOptions = options.categories;
  const topLevelCategories = useMemo(
    () => categoryOptions.filter((c) => !c.parentId),
    [categoryOptions]
  );
  const parentGroups = useMemo(() => {
    const byParent = new Map<string, (typeof categoryOptions)[number][]>();
    for (const c of categoryOptions) {
      if (!c.parentId) continue;
      const list = byParent.get(c.parentId) ?? [];
      list.push(c);
      byParent.set(c.parentId, list);
    }
    return Array.from(byParent.entries())
      .map(([parentId, children]) => {
        const parent = categoryOptions.find((c) => c.id === parentId);
        return parent ? ([parent, children] as const) : null;
      })
      .filter((entry): entry is readonly [(typeof categoryOptions)[number], (typeof categoryOptions)[number][]] => entry !== null);
  }, [categoryOptions]);
  const selectedCategoryIcon = useMemo(
    () => categoryOptions.find((c) => c.id === values.categoryId)?.iconUrl ?? null,
    [categoryOptions, values.categoryId]
  );

  // Requests polish pass: the city select is no longer filtered by a
  // separately-chosen country (that field was removed) — group every
  // city by its own country instead, via the SAME native <optgroup>
  // pattern already used for categories above, so the list stays easy
  // to scan without needing a country picker first.
  const countryOptions = options.countries;
  const cityOptions = options.cities;
  const countryNameById = useMemo(() => new Map(countryOptions.map((c) => [c.id, c.name])), [countryOptions]);
  const cityGroups = useMemo(() => {
    const byCountry = new Map<string, typeof cityOptions>();
    for (const city of cityOptions) {
      const list = byCountry.get(city.countryId) ?? [];
      list.push(city);
      byCountry.set(city.countryId, list);
    }
    return Array.from(byCountry.entries()).map(
      ([countryId, cities]) => [countryNameById.get(countryId) ?? "", cities] as const
    );
  }, [cityOptions, countryNameById]);

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
    const contactPayload = {
      contactPhone: values.contactPhone.trim() || undefined,
      contactPhoneVisible: values.contactPhoneVisible,
      contactWhatsapp: values.contactWhatsapp.trim() || undefined,
      contactWhatsappVisible: values.contactWhatsappVisible,
      contactEmail: values.contactEmail.trim() || undefined,
      contactEmailVisible: values.contactEmailVisible,
    };

    try {
      if (mode === "create") {
        const { data } = await apiFetch<{ data: RequestDetail }>("/api/requests", {
          method: "POST",
          body: JSON.stringify({
            categoryId: values.categoryId,
            cityId: values.cityId,
            title: values.title,
            description: values.description,
            budgetMin,
            budgetMax,
            ...contactPayload,
          }),
        });

        // Request is already saved at this point — image upload
        // failures are surfaced but don't block navigating away, since
        // the request itself succeeded (existing media endpoint,
        // uploaded sequentially so sortOrder comes out correct).
        for (const staged of stagedImages) {
          try {
            const formData = new FormData();
            formData.set("file", staged.file);
            await apiFetch(`/api/media/requests/${data.id}`, { method: "POST", body: formData });
          } catch {
            setFormError("تم نشر طلبك، لكن تعذر رفع بعض الصور. يمكنك إضافتها لاحقاً من صفحة الطلب.");
          }
        }

        setJustPublished(true);
        router.refresh();
        return;
      } else {
        const { data } = await apiFetch<{ data: RequestDetail }>(`/api/requests/${requestId}`, {
          method: "PATCH",
          body: JSON.stringify({
            categoryId: values.categoryId,
            cityId: values.cityId || undefined,
            title: values.title,
            description: values.description,
            budgetMin: budgetMin ?? null,
            budgetMax: budgetMax ?? null,
            ...contactPayload,
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

  function handleCreateAnother() {
    setValues({ ...EMPTY_VALUES });
    setStagedImages([]);
    setFormError(null);
    setFieldErrors({});
    setJustPublished(false);
  }

  return (
    <Card className="mx-auto max-w-2xl">
      {mode === "create" && justPublished ? (
        <div dir="rtl" className="flex flex-col items-center py-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-3xl text-teal-600">
            ✓
          </span>
          <h2 className="mt-4 font-display text-xl font-extrabold text-navy-950">تم نشر طلبك بنجاح</h2>
          <p className="mt-2 text-sm text-text-500">سيبدأ الموردون المناسبون بالتواصل معك قريباً.</p>
          <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
            <Button size="lg" className="w-full" onClick={handleCreateAnother}>
              إنشاء طلب جديد
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={() => router.push("/")}>
              العودة للرئيسية
            </Button>
          </div>
        </div>
      ) : (
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
          <div className="flex items-center gap-2">
            <Select
              value={values.categoryId}
              onChange={(e) => update("categoryId", e.target.value)}
              required
              className="flex-1"
            >
              <option value="">اختر التصنيف</option>
              {topLevelCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              {parentGroups.map(([parent, children]) => (
                <optgroup key={parent.id} label={parent.name}>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
            {selectedCategoryIcon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedCategoryIcon}
                alt=""
                className="h-9 w-9 flex-shrink-0 rounded-lg border border-border object-cover"
              />
            )}
          </div>
        </FormField>

        <FormField label="المدينة">
          <Select value={values.cityId} onChange={(e) => update("cityId", e.target.value)} required>
            <option value="">اختر المدينة</option>
            {cityGroups.map(([countryName, cities]) => (
              <optgroup key={countryName} label={countryName}>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
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

        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm font-bold text-navy-950">معلومات التواصل (اختياري)</p>
          <p className="text-xs text-text-400">
            اختياري بالكامل — فعّل &quot;إظهار للزوار&quot; لأي وسيلة تريد أن يراها من يزور صفحة طلبك، ويمكنك تعديلها لاحقاً.
          </p>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <FormField label="رقم الجوال">
              <Input
                dir="ltr"
                placeholder="05XXXXXXXX"
                value={values.contactPhone}
                onChange={(e) => update("contactPhone", e.target.value)}
              />
            </FormField>
            </div>
            <label className="mb-2 flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-text-500">
              <input
                type="checkbox"
                checked={values.contactPhoneVisible}
                onChange={(e) => update("contactPhoneVisible", e.target.checked)}
                className="h-4 w-4 rounded border-border-strong text-teal-600 focus:ring-teal-500"
              />
              إظهار للزوار
            </label>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <FormField label="رقم الواتساب">
              <Input
                dir="ltr"
                placeholder="05XXXXXXXX"
                value={values.contactWhatsapp}
                onChange={(e) => update("contactWhatsapp", e.target.value)}
              />
            </FormField>
            </div>
            <label className="mb-2 flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-text-500">
              <input
                type="checkbox"
                checked={values.contactWhatsappVisible}
                onChange={(e) => update("contactWhatsappVisible", e.target.checked)}
                className="h-4 w-4 rounded border-border-strong text-teal-600 focus:ring-teal-500"
              />
              إظهار للزوار
            </label>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <FormField label="البريد الإلكتروني">
              <Input
                dir="ltr"
                type="email"
                placeholder="example@email.com"
                value={values.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
              />
            </FormField>
            </div>
            <label className="mb-2 flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-text-500">
              <input
                type="checkbox"
                checked={values.contactEmailVisible}
                onChange={(e) => update("contactEmailVisible", e.target.checked)}
                className="h-4 w-4 rounded border-border-strong text-teal-600 focus:ring-teal-500"
              />
              إظهار للزوار
            </label>
          </div>
        </div>

        {mode === "create" && (
          <FormField label="صور الطلب (اختياري)">
            <ImageDropzone images={stagedImages} onChange={setStagedImages} />
          </FormField>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? "جارٍ الحفظ..."
            : mode === "create"
              ? "انشر طلبك الآن"
              : "حفظ التعديلات"}
        </Button>
      </form>
      )}
    </Card>
  );
}
