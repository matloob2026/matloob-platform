import { Newspaper } from "lucide-react";
import { requirePermission } from "@/auth/guards";
import { CmsPlaceholder } from "@/components/admin/CmsPlaceholder";

/**
 * CMS foundation placeholder (Checkpoint 01) — Blog / Articles. Like
 * Static Pages, this needs its own model (title, slug, body, author,
 * published state, per-article SEO) that doesn't exist in the schema
 * yet — deliberately not introduced in this checkpoint, which is
 * scoped to CMS navigation/architecture + the Categories screen only.
 */
export default async function AdminBlogPage() {
  await requirePermission("blog:view");

  return (
    <CmsPlaceholder
      title="المدونة / المقالات"
      description="نشر مقالات ومحتوى تسويقي مرتبط بالمنصة"
      icon={Newspaper}
      plannedControls={[
        "إنشاء/تعديل/حذف مقالات بعنوان وصورة غلاف ومحتوى",
        "حالة المسودة والنشر لكل مقال",
        "تصنيف المقالات ودعم اللغتين",
        "ربط كل مقال بإعدادات SEO الخاصة به (عبر جدول SeoSetting الموجود)",
      ]}
    />
  );
}
