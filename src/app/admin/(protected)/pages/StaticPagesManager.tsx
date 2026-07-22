"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, FormField, Toggle } from "@/components/ui/Field";
import { TranslationTabs } from "@/components/admin/TranslationTabs";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import type { StaticPageListItem, NavPlacement } from "@/services/admin/static-page.service";
import {
  createStaticPageAction,
  updateStaticPageAction,
  setStaticPageActiveAction,
  deleteStaticPageAction,
} from "./actions";

const PAGE_SIZE = 20;

/** Mirrors SLUG_PATTERN in src/services/admin/static-page.service.ts
 * exactly — used here only for an instant, non-authoritative UI hint;
 * the server always re-validates (and normalizes) independently. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface FormValues {
  slug: string;
  titleAr: string;
  titleEn: string;
  contentAr: string;
  contentEn: string;
  isActive: boolean;
  navPlacement: NavPlacement;
  navOrder: string;
}

const EMPTY_FORM: FormValues = {
  slug: "",
  titleAr: "",
  titleEn: "",
  contentAr: "",
  contentEn: "",
  isActive: true,
  navPlacement: "none",
  navOrder: "0",
};

const NAV_PLACEMENT_LABELS: Record<NavPlacement, string> = {
  main: "القائمة الرئيسية",
  footer: "التذييل (Footer)",
  both: "كلاهما",
  none: "لا شيء (رابط مباشر فقط)",
};

function toFormValues(page: StaticPageListItem): FormValues {
  return {
    slug: page.slug,
    titleAr: page.titleAr,
    titleEn: page.titleEn,
    contentAr: page.contentAr,
    contentEn: page.contentEn,
    isActive: page.isActive,
    navPlacement: page.navPlacement,
    navOrder: String(page.navOrder),
  };
}

/** Real, database-backed Static Pages management — Checkpoint 03.
 * Checkpoint 05 adds admin control over navigation placement (main
 * nav / footer / both / neither) and display order per page, stored
 * in PageContent.extra (see static-page.service.ts) — no schema
 * change, no duplicate system.
 * Reuses the existing PageContent model and the same DataTable/
 * TranslationTabs pattern Categories/Homepage used in Checkpoints
 * 01/02. */
export function StaticPagesManager({ initialPages }: { initialPages: StaticPageListItem[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<FormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | undefined>();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return initialPages;
    return initialPages.filter(
      (p) => p.titleAr.includes(search.trim()) || p.titleEn.toLowerCase().includes(q) || p.slug.includes(q)
    );
  }, [initialPages, search]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openCreateForm() {
    setEditingSlug(null);
    setFormValues(EMPTY_FORM);
    setFormError(undefined);
    setShowForm(true);
  }

  function openEditForm(item: StaticPageListItem) {
    setEditingSlug(item.slug);
    setFormValues(toFormValues(item));
    setFormError(undefined);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setFormError(undefined);
  }

  function handleSave() {
    setFormError(undefined);
    startTransition(async () => {
      const input = {
        slug: formValues.slug.trim().toLowerCase(),
        titleAr: formValues.titleAr.trim(),
        titleEn: formValues.titleEn.trim(),
        contentAr: formValues.contentAr.trim(),
        contentEn: formValues.contentEn.trim(),
        isActive: formValues.isActive,
        navPlacement: formValues.navPlacement,
        navOrder: Number(formValues.navOrder) || 0,
      };

      const result = editingSlug
        ? await updateStaticPageAction(editingSlug, input)
        : await createStaticPageAction(input);

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      showToast(editingSlug ? "تم تحديث الصفحة بنجاح." : "تم إضافة الصفحة بنجاح.", "success");
      setShowForm(false);
      router.refresh();
    });
  }

  function handleToggleActive(item: StaticPageListItem) {
    startTransition(async () => {
      const result = await setStaticPageActiveAction(item.slug, !item.isActive);
      if (!result.success) {
        showToast(result.error ?? "تعذر تحديث حالة الصفحة.", "error");
        return;
      }
      showToast(!item.isActive ? "تم نشر الصفحة." : "تم إخفاء الصفحة.", "success");
      router.refresh();
    });
  }

  async function handleDelete(item: StaticPageListItem) {
    const confirmed = await confirm({
      title: `حذف "${item.titleAr}"؟`,
      message: "لا يمكن التراجع عن هذا الإجراء.",
      confirmLabel: "حذف",
      danger: true,
    });
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteStaticPageAction(item.slug);
      if (!result.success) {
        showToast(result.error ?? "تعذر حذف الصفحة.", "error");
        return;
      }
      showToast("تم حذف الصفحة بنجاح.", "success");
      router.refresh();
    });
  }

  const columns: DataTableColumn<StaticPageListItem>[] = [
    {
      key: "title",
      header: "الصفحة",
      render: (p) => (
        <div>
          <p className="font-bold text-navy-950">{p.titleAr}</p>
          <p className="text-xs text-text-400">{p.titleEn}</p>
        </div>
      ),
    },
    {
      key: "slug",
      header: "الرابط",
      render: (p) => (
        <a
          href={`/pages/${p.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-teal-600 hover:underline"
          dir="ltr"
        >
          /pages/{p.slug} <ExternalLink className="h-3 w-3" />
        </a>
      ),
    },
    {
      key: "status",
      header: "الحالة",
      render: (p) => (
        <button onClick={() => handleToggleActive(p)} disabled={isPending} className="disabled:opacity-50">
          <Badge tone={p.isActive ? "success" : "neutral"}>{p.isActive ? "منشورة" : "غير منشورة"}</Badge>
        </button>
      ),
    },
    {
      key: "navigation",
      header: "الظهور في التنقل",
      render: (p) => (
        <div className="text-xs">
          <Badge tone={p.navPlacement === "none" ? "neutral" : "info"}>{NAV_PLACEMENT_LABELS[p.navPlacement]}</Badge>
          {p.navPlacement !== "none" && <p className="mt-1 text-text-400">الترتيب: {p.navOrder}</p>}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEditForm(p)}
            className="rounded-lg p-2 text-text-400 transition hover:bg-surface-muted hover:text-teal-600"
            aria-label="تعديل"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(p)}
            disabled={isPending}
            className="rounded-lg p-2 text-text-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label="حذف"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
      className: "w-20",
    },
  ];

  return (
    <div>
      <PageHeader
        title="الصفحات الثابتة"
        description="صفحات مثل «من نحن»، «الشروط والأحكام»، و«سياسة الخصوصية» — تُفتح مباشرة عبر /pages/الرابط"
        actions={
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4" /> إضافة صفحة
          </Button>
        }
      />

      {showForm && (
        <div className="mb-6 rounded-card border border-border bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-navy-950">
              {editingSlug ? "تعديل الصفحة" : "صفحة جديدة"}
            </h3>
            <button onClick={closeForm} className="rounded-lg p-1.5 text-text-400 hover:bg-surface-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <FormField label="الرابط (Slug)" hint="يُستخدم في /pages/الرابط — أحرف إنجليزية صغيرة وأرقام وشرطات فقط، مثل about أو privacy-policy">
              <Input
                placeholder="privacy-policy"
                dir="ltr"
                value={formValues.slug}
                onChange={(e) => setFormValues((v) => ({ ...v, slug: e.target.value }))}
              />
              {/* Only shown once the admin has typed something — never
                  flags an untouched/empty field, and never flags a
                  genuinely valid slug like "about" or "privacy-policy"
                  (same SLUG_PATTERN the server normalizes and validates
                  against — see static-page.service.ts). */}
              {formValues.slug.trim().length > 0 && !SLUG_PATTERN.test(formValues.slug.trim().toLowerCase()) && (
                <span className="mt-1 block text-xs font-semibold text-red-600">
                  الرابط يجب أن يحتوي على أحرف إنجليزية صغيرة وأرقام وشرطات فقط، بدون مسافات أو أحرف عربية.
                </span>
              )}
            </FormField>

            <p className="mb-2 text-xs text-text-400">
              اختر اللغة التي تريد تحريرها من التبويبين أدناه. يمكنك حفظ الصفحة بلغة واحدة فقط (عربي أو
              إنجليزي) — تحرير لغة لا يحذف أو يستبدل محتوى اللغة الأخرى المحفوظ مسبقاً.
            </p>
            <TranslationTabs
              render={(locale) => (
                <div className="space-y-4">
                  <FormField label={locale === "ar" ? "العنوان (عربي)" : "Title (English)"}>
                    <Input
                      placeholder={locale === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}
                      value={locale === "ar" ? formValues.titleAr : formValues.titleEn}
                      onChange={(e) =>
                        setFormValues((v) =>
                          locale === "ar" ? { ...v, titleAr: e.target.value } : { ...v, titleEn: e.target.value }
                        )
                      }
                    />
                  </FormField>
                  <FormField
                    label={locale === "ar" ? "المحتوى (عربي)" : "Content (English)"}
                    hint={
                      locale === "ar"
                        ? "تُنسَّق الفقرات تلقائياً — اترك سطراً فارغاً بين الفقرات، ابدأ سطراً بـ '- ' لعمل نقاط، وبـ '# ' أو '## ' لعنوان فرعي. لا حاجة لكتابة HTML."
                        : "Formatting is automatic — leave a blank line between paragraphs, start a line with '- ' for a bullet list, and '# ' or '## ' for a subheading. No HTML needed."
                    }
                  >
                    <Textarea
                      rows={10}
                      value={locale === "ar" ? formValues.contentAr : formValues.contentEn}
                      onChange={(e) =>
                        setFormValues((v) =>
                          locale === "ar" ? { ...v, contentAr: e.target.value } : { ...v, contentEn: e.target.value }
                        )
                      }
                    />
                  </FormField>
                </div>
              )}
            />

            <Toggle
              checked={formValues.isActive}
              onChange={(value) => setFormValues((v) => ({ ...v, isActive: value }))}
              label="منشورة (تظهر للزوار على الرابط العام)"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="الظهور في التنقل"
                hint="أين يظهر رابط هذه الصفحة على الموقع العام — تبقى الصفحة متاحة عبر رابطها المباشر دائماً بغض النظر عن هذا الخيار"
              >
                <Select
                  value={formValues.navPlacement}
                  onChange={(e) =>
                    setFormValues((v) => ({ ...v, navPlacement: e.target.value as typeof v.navPlacement }))
                  }
                >
                  <option value="none">{NAV_PLACEMENT_LABELS.none}</option>
                  <option value="main">{NAV_PLACEMENT_LABELS.main}</option>
                  <option value="footer">{NAV_PLACEMENT_LABELS.footer}</option>
                  <option value="both">{NAV_PLACEMENT_LABELS.both}</option>
                </Select>
              </FormField>
              <FormField label="ترتيب الظهور" hint="الأصغر يظهر أولاً">
                <Input
                  type="number"
                  dir="ltr"
                  value={formValues.navOrder}
                  onChange={(e) => setFormValues((v) => ({ ...v, navOrder: e.target.value }))}
                />
              </FormField>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={closeForm} disabled={isPending}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "جارٍ الحفظ..." : "حفظ الصفحة"}
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={paged}
        getRowId={(p) => p.slug}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="بحث عن صفحة..."
        page={page}
        pageSize={PAGE_SIZE}
        totalItems={filtered.length}
        onPageChange={setPage}
        emptyTitle="لا توجد صفحات"
        emptyDescription="ابدأ بإضافة أول صفحة ثابتة مثل «من نحن» أو «الشروط والأحكام»."
      />
    </div>
  );
}
