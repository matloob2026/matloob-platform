"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, ExternalLink } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, FormField, Toggle } from "@/components/ui/Field";
import { TranslationTabs } from "@/components/admin/TranslationTabs";
import { MediaPicker, type MediaPickerValue } from "@/components/admin/MediaPicker";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import type { AdminBlogPostListItem, BlogPostStatusValue } from "@/services/admin/blog.service";
import type { AdminCategoryListItem } from "@/services/admin/category.service";
import type { SeoFields } from "@/services/admin/seo.service";
import {
  createBlogPostAction,
  updateBlogPostAction,
  setBlogPostStatusAction,
  deleteBlogPostAction,
} from "./actions";
import { getEntitySeoAction, saveEntitySeoAction } from "../seo/actions";

const PAGE_SIZE = 20;

interface FormValues {
  slug: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string;
  excerptEn: string;
  contentAr: string;
  contentEn: string;
  status: BlogPostStatusValue;
  sortOrder: string;
  categoryId: string;
  featuredMedia: MediaPickerValue | null;
  gallery: MediaPickerValue[];
}

const EMPTY_FORM: FormValues = {
  slug: "",
  titleAr: "",
  titleEn: "",
  excerptAr: "",
  excerptEn: "",
  contentAr: "",
  contentEn: "",
  status: "DRAFT",
  sortOrder: "0",
  categoryId: "",
  featuredMedia: null,
  gallery: [],
};

const STATUS_LABELS: Record<BlogPostStatusValue, string> = {
  DRAFT: "مسودة",
  PUBLISHED: "منشور",
};

function toFormValues(post: AdminBlogPostListItem): FormValues {
  return {
    slug: post.slug,
    titleAr: post.titleAr,
    titleEn: post.titleEn,
    excerptAr: post.excerptAr,
    excerptEn: post.excerptEn,
    contentAr: post.contentAr,
    contentEn: post.contentEn,
    status: post.status,
    sortOrder: String(post.sortOrder),
    categoryId: post.categoryId ?? "",
    featuredMedia: post.featuredMedia,
    gallery: post.gallery,
  };
}

/** Real, database-backed Blog management. Reuses the existing
 * BlogPost/BlogPostTranslation model, the existing Media Library
 * (`<MediaPicker>`), the existing SEO CMS (`getEntitySeoAction`/
 * `saveEntitySeoAction` — same as StaticPagesManager.tsx), the
 * existing Categories data, and the same DataTable/TranslationTabs/
 * Toast/ConfirmDialog pattern every other CMS screen in this Admin
 * Dashboard already uses — no parallel component system. */
export function BlogManager({
  initialPosts,
  categories,
}: {
  initialPosts: AdminBlogPostListItem[];
  categories: AdminCategoryListItem[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BlogPostStatusValue>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<FormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | undefined>();

  // Page-specific SEO (SeoSetting, entityType "blog_post") — reuses
  // the same SEO CMS actions as src/app/admin/(protected)/seo/actions.ts,
  // no duplicate SEO system. Only loadable/savable for an EXISTING
  // post (its id is a stable key to key SeoSetting rows on) — a
  // brand-new post shows a note asking the admin to save first.
  const [seoValues, setSeoValues] = useState<{ ar: SeoFields; en: SeoFields } | null>(null);
  const [seoLoading, setSeoLoading] = useState(false);

  const filtered = useMemo(() => {
    let items = initialPosts;
    if (statusFilter !== "all") items = items.filter((p) => p.status === statusFilter);
    if (categoryFilter !== "all") items = items.filter((p) => p.categoryId === categoryFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (p) =>
          p.titleAr.toLowerCase().includes(q) ||
          p.titleEn.toLowerCase().includes(q) ||
          p.excerptAr.toLowerCase().includes(q) ||
          p.excerptEn.toLowerCase().includes(q)
      );
    }
    return items;
  }, [initialPosts, search, statusFilter, categoryFilter]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openCreateForm() {
    setEditingId(null);
    setFormValues(EMPTY_FORM);
    setFormError(undefined);
    setSeoValues(null);
    setShowForm(true);
  }

  function openEditForm(post: AdminBlogPostListItem) {
    setEditingId(post.id);
    setFormValues(toFormValues(post));
    setFormError(undefined);
    setSeoValues(null);
    setShowForm(true);
    setSeoLoading(true);
    getEntitySeoAction("blog_post", post.id)
      .then((seo) => setSeoValues(seo))
      .finally(() => setSeoLoading(false));
  }

  function closeForm() {
    setShowForm(false);
    setFormError(undefined);
  }

  function handleSave() {
    setFormError(undefined);
    startTransition(async () => {
      const input = {
        slug: formValues.slug.trim().toLowerCase() || undefined,
        titleAr: formValues.titleAr.trim(),
        titleEn: formValues.titleEn.trim(),
        excerptAr: formValues.excerptAr.trim() || null,
        excerptEn: formValues.excerptEn.trim() || null,
        contentAr: formValues.contentAr.trim() || null,
        contentEn: formValues.contentEn.trim() || null,
        status: formValues.status,
        sortOrder: Number(formValues.sortOrder) || 0,
        categoryId: formValues.categoryId || null,
        featuredMediaId: formValues.featuredMedia?.id ?? null,
        galleryMediaIds: formValues.gallery.map((m) => m.id),
      };

      const result = editingId ? await updateBlogPostAction(editingId, input) : await createBlogPostAction(input);

      if (!result.success) {
        setFormError(result.error);
        return;
      }

      // SEO is only saved for a post that already existed before this
      // save (its id is a stable id to key SeoSetting rows on) — a
      // brand-new post shows a note asking the admin to save first,
      // then reopen it to set SEO.
      if (editingId && seoValues) {
        await saveEntitySeoAction("blog_post", editingId, {
          ar: {
            metaTitle: seoValues.ar.metaTitle,
            metaDescription: seoValues.ar.metaDescription,
            canonicalUrl: seoValues.ar.canonicalUrl,
            noIndex: seoValues.ar.noIndex,
            ogImageMediaId: seoValues.ar.ogImage?.id ?? null,
          },
          en: {
            metaTitle: seoValues.en.metaTitle,
            metaDescription: seoValues.en.metaDescription,
            canonicalUrl: seoValues.en.canonicalUrl,
            noIndex: seoValues.en.noIndex,
            ogImageMediaId: seoValues.en.ogImage?.id ?? null,
          },
        });
      }

      showToast(editingId ? "تم تحديث المقال بنجاح." : "تم إضافة المقال بنجاح.", "success");
      setShowForm(false);
      router.refresh();
    });
  }

  function handleStatusToggle(post: AdminBlogPostListItem) {
    startTransition(async () => {
      const nextStatus: BlogPostStatusValue = post.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
      const result = await setBlogPostStatusAction(post.id, nextStatus);
      if (!result.success) {
        showToast(result.error ?? "تعذر تحديث حالة المقال.", "error");
        return;
      }
      showToast(nextStatus === "PUBLISHED" ? "تم نشر المقال." : "تم إرجاع المقال إلى مسودة.", "success");
      router.refresh();
    });
  }

  async function handleDelete(post: AdminBlogPostListItem) {
    const confirmed = await confirm({
      title: `حذف "${post.titleAr || post.titleEn}"؟`,
      message: "لا يمكن التراجع عن هذا الإجراء.",
      confirmLabel: "حذف",
      danger: true,
    });
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteBlogPostAction(post.id);
      if (!result.success) {
        showToast(result.error ?? "تعذر حذف المقال.", "error");
        return;
      }
      showToast("تم حذف المقال بنجاح.", "success");
      router.refresh();
    });
  }

  function addGalleryImage(media: MediaPickerValue | null) {
    if (!media) return;
    setFormValues((v) => (v.gallery.some((m) => m.id === media.id) ? v : { ...v, gallery: [...v.gallery, media] }));
  }

  function removeGalleryImage(id: string) {
    setFormValues((v) => ({ ...v, gallery: v.gallery.filter((m) => m.id !== id) }));
  }

  const columns: DataTableColumn<AdminBlogPostListItem>[] = [
    {
      key: "title",
      header: "المقال",
      render: (p) => (
        <div className="flex items-center gap-2">
          {p.featuredMedia && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.featuredMedia.url} alt="" className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" />
          )}
          <div>
            <p className="font-bold text-navy-950">{p.titleAr || p.titleEn}</p>
            <p className="text-xs text-text-400">{p.titleEn}</p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "التصنيف", render: (p) => p.categoryName ?? "—" },
    { key: "author", header: "الكاتب", render: (p) => p.authorName ?? "—" },
    {
      key: "status",
      header: "الحالة",
      render: (p) => (
        <button onClick={() => handleStatusToggle(p)} disabled={isPending} className="disabled:opacity-50">
          <Badge tone={p.status === "PUBLISHED" ? "success" : "neutral"}>{STATUS_LABELS[p.status]}</Badge>
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div className="flex items-center gap-1">
          <a
            href={`/blog/${p.slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg p-2 text-text-400 transition hover:bg-surface-muted hover:text-teal-600"
            aria-label="معاينة"
            title="معاينة"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
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
      className: "w-28",
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-text-500">إنشاء مقال جديد لا يحتاج أي تعديل برمجي — متصل مباشرة بقاعدة البيانات.</p>
        <Button onClick={openCreateForm}>
          <Plus className="h-4 w-4" /> مقال جديد
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-card border border-border bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-navy-950">{editingId ? "تعديل المقال" : "مقال جديد"}</h3>
            <button onClick={closeForm} className="rounded-lg p-1.5 text-text-400 hover:bg-surface-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
              {formError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <TranslationTabs
              render={(locale) => (
                <div className="space-y-4">
                  <FormField label={locale === "ar" ? "العنوان (عربي)" : "Title (English)"}>
                    <Input
                      placeholder={locale === "ar" ? "مثال: نصائح قبل شراء سيارة مستعملة" : "e.g. Tips before buying a used car"}
                      value={locale === "ar" ? formValues.titleAr : formValues.titleEn}
                      onChange={(e) =>
                        setFormValues((v) =>
                          locale === "ar" ? { ...v, titleAr: e.target.value } : { ...v, titleEn: e.target.value }
                        )
                      }
                    />
                  </FormField>
                  <FormField label={locale === "ar" ? "مقتطف مختصر" : "Short excerpt"}>
                    <Textarea
                      rows={2}
                      value={locale === "ar" ? formValues.excerptAr : formValues.excerptEn}
                      onChange={(e) =>
                        setFormValues((v) =>
                          locale === "ar" ? { ...v, excerptAr: e.target.value } : { ...v, excerptEn: e.target.value }
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

                  {editingId ? (
                    <div className="space-y-4 border-t border-border pt-4">
                      <p className="text-sm font-bold text-navy-950">
                        {locale === "ar" ? "SEO لهذا المقال (عربي)" : "SEO for this article (English)"}
                      </p>
                      {seoLoading || !seoValues ? (
                        <p className="text-xs text-text-400">
                          {locale === "ar" ? "جارٍ تحميل إعدادات SEO..." : "Loading SEO settings..."}
                        </p>
                      ) : (
                        <>
                          <FormField label={locale === "ar" ? "عنوان SEO" : "SEO title"}>
                            <Input
                              value={seoValues[locale].metaTitle}
                              onChange={(e) =>
                                setSeoValues((v) =>
                                  v ? { ...v, [locale]: { ...v[locale], metaTitle: e.target.value } } : v
                                )
                              }
                            />
                          </FormField>
                          <FormField label={locale === "ar" ? "وصف Meta" : "Meta description"}>
                            <Textarea
                              rows={2}
                              value={seoValues[locale].metaDescription}
                              onChange={(e) =>
                                setSeoValues((v) =>
                                  v ? { ...v, [locale]: { ...v[locale], metaDescription: e.target.value } } : v
                                )
                              }
                            />
                          </FormField>
                          <FormField label={locale === "ar" ? "الرابط الأساسي (Canonical URL)" : "Canonical URL"}>
                            <Input
                              dir="ltr"
                              value={seoValues[locale].canonicalUrl}
                              onChange={(e) =>
                                setSeoValues((v) =>
                                  v ? { ...v, [locale]: { ...v[locale], canonicalUrl: e.target.value } } : v
                                )
                              }
                            />
                          </FormField>
                          <FormField label={locale === "ar" ? "صورة Open Graph / Twitter" : "Open Graph / Twitter image"}>
                            <MediaPicker
                              value={seoValues[locale].ogImage}
                              onChange={(media) =>
                                setSeoValues((v) => (v ? { ...v, [locale]: { ...v[locale], ogImage: media } } : v))
                              }
                            />
                          </FormField>
                          <Toggle
                            checked={seoValues[locale].noIndex}
                            onChange={(value) =>
                              setSeoValues((v) => (v ? { ...v, [locale]: { ...v[locale], noIndex: value } } : v))
                            }
                            label={locale === "ar" ? "إخفاء عن محركات البحث (noindex)" : "Hide from search engines (noindex)"}
                          />
                        </>
                      )}
                    </div>
                  ) : (
                    locale === "ar" && (
                      <p className="border-t border-border pt-4 text-xs text-text-400">
                        احفظ المقال أولاً، ثم أعد فتحه لتعديل إعدادات SEO الخاصة به.
                      </p>
                    )
                  )}
                </div>
              )}
            />
            <div className="space-y-4">
              <FormField label="الرابط (Slug)" hint={editingId ? "لا يتغيّر تلقائياً عند تعديل العنوان" : "يُنشأ تلقائياً من العنوان عند الحفظ"}>
                <Input dir="ltr" disabled value={formValues.slug || "سيتم إنشاؤه تلقائياً من العنوان"} />
              </FormField>
              <FormField label="التصنيف">
                <Select
                  value={formValues.categoryId}
                  onChange={(e) => setFormValues((v) => ({ ...v, categoryId: e.target.value }))}
                >
                  <option value="">بدون تصنيف</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="ترتيب العرض" hint="الأصغر يظهر أولاً">
                <Input
                  type="number"
                  dir="ltr"
                  value={formValues.sortOrder}
                  onChange={(e) => setFormValues((v) => ({ ...v, sortOrder: e.target.value }))}
                />
              </FormField>
              <FormField label="صورة الغلاف (Featured Image)">
                <MediaPicker
                  value={formValues.featuredMedia}
                  onChange={(media) => setFormValues((v) => ({ ...v, featuredMedia: media }))}
                />
              </FormField>
              <FormField label="معرض الصور (اختياري)">
                <div className="space-y-2">
                  {formValues.gallery.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formValues.gallery.map((media) => (
                        <div key={media.id} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={media.url} alt="" className="h-14 w-14 rounded-lg border border-border object-cover" />
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(media.id)}
                            className="absolute -left-1.5 -top-1.5 rounded-full bg-white p-0.5 text-red-600 shadow-card"
                            aria-label="إزالة"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <MediaPicker value={null} onChange={addGalleryImage} label="إضافة صورة للمعرض" />
                </div>
              </FormField>
              <Toggle
                checked={formValues.status === "PUBLISHED"}
                onChange={(value) => setFormValues((v) => ({ ...v, status: value ? "PUBLISHED" : "DRAFT" }))}
                label="منشور (يظهر للزوار على الرابط العام)"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={closeForm} disabled={isPending}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "جارٍ الحفظ..." : "حفظ المقال"}
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={paged}
        getRowId={(p) => p.id}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="بحث عن مقال..."
        filters={
          <>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setPage(1);
              }}
            >
              <option value="all">كل الحالات</option>
              <option value="PUBLISHED">منشور</option>
              <option value="DRAFT">مسودة</option>
            </Select>
            <Select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">كل التصنيفات</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </Select>
          </>
        }
        page={page}
        pageSize={PAGE_SIZE}
        totalItems={filtered.length}
        onPageChange={setPage}
        emptyTitle="لا توجد مقالات"
        emptyDescription="ابدأ بإضافة أول مقال في المدونة."
      />
    </div>
  );
}
