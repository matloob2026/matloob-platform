import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

/**
 * Shared "foundation laid, not built yet" screen for CMS sections that
 * have a nav entry (Checkpoint 01 scope) but no management UI yet
 * (Checkpoint 01 explicitly excludes them — Currencies, Static Pages,
 * Blog/Articles). Mirrors the existing "قريباً" pattern already used by
 * src/app/admin/(protected)/ai/page.tsx, so the Admin Dashboard stays
 * visually consistent rather than introducing a second placeholder
 * style.
 */
export function CmsPlaceholder({
  title,
  description,
  icon: Icon,
  plannedControls,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  /** What this screen will manage once built — sets expectations without
   * implementing it. */
  plannedControls: string[];
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <Icon className="h-5 w-5" />
          </div>
          <Badge tone="neutral">قريباً</Badge>
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-navy-950">
          هذا القسم جزء من أساس نظام إدارة المحتوى (CMS)
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-text-500">
          تمت إضافته إلى قائمة التنقل كتمهيد لمرحلة قادمة. لا توجد أي بيانات وهمية أو إدارة فعلية هنا بعد — سيتم بناء
          الإدارة الكاملة في نقطة تحقق لاحقة، دون تكرار أي نموذج بيانات موجود.
        </p>
        <ul className="mt-4 space-y-2 border-t border-border pt-4">
          {plannedControls.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-text-700">
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-500" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
