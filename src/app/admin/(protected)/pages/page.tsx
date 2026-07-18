import { FileText } from "lucide-react";
import { requirePermission } from "@/auth/guards";
import { CmsPlaceholder } from "@/components/admin/CmsPlaceholder";

/**
 * CMS foundation placeholder (Checkpoint 01) — Static Pages (e.g. "About",
 * "Terms", "Privacy Policy"). No dedicated model exists for these yet —
 * the closest existing table, `PageContent`, is shaped around named
 * homepage sections (page/section/locale), not arbitrary owner-authored
 * pages, so a real static-pages content model is a future checkpoint's
 * schema decision rather than something to bolt on here.
 */
export default async function AdminStaticPagesPage() {
  await requirePermission("pages:view");

  return (
    <CmsPlaceholder
      title="الصفحات الثابتة"
      description="إدارة صفحات مثل «من نحن»، «الشروط والأحكام»، و«سياسة الخصوصية»"
      icon={FileText}
      plannedControls={[
        "إنشاء صفحة جديدة بعنوان ورابط ومحتوى قابل للتحرير",
        "نشر/إخفاء كل صفحة بشكل مستقل",
        "دعم اللغتين العربية والإنجليزية لكل صفحة",
        "ربط كل صفحة بإعدادات SEO الخاصة بها (عبر جدول SeoSetting الموجود)",
      ]}
    />
  );
}
