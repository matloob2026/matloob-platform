"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Star, Trash2, User as UserIcon, ExternalLink, Flag } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { RequestStatusBadge } from "@/components/requests/RequestStatusBadge";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import type { AdminRequestDetail, AdminRequestStatus } from "@/services/admin/request-admin.service";
import { setRequestStatusAction, setRequestFeaturedAction, softDeleteRequestAction, setReportStatusAction } from "../actions";

const SETTABLE_STATUSES: { value: AdminRequestStatus; label: string }[] = [
  { value: "DRAFT", label: "مسودة" },
  { value: "PENDING_REVIEW", label: "بانتظار المراجعة" },
  { value: "PUBLISHED", label: "منشور" },
  { value: "CLOSED_BY_BUYER", label: "مغلق" },
  { value: "REJECTED", label: "مرفوض" },
];

const REPORT_STATUS_LABEL: Record<string, string> = {
  OPEN: "مفتوح",
  UNDER_REVIEW: "قيد المراجعة",
  RESOLVED: "تم الحل",
  DISMISSED: "تم التجاهل",
};

/** Requests Administration Module — full detail view. Reuses the
 * existing Card/Button/Badge/RequestStatusBadge components; status
 * changes, featuring, soft delete, and report actions all go through
 * the same server actions the list page uses — no duplicate logic. */
export function RequestDetailView({ detail }: { detail: AdminRequestDetail }) {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [status, setStatusValue] = useState<AdminRequestStatus>(detail.status);

  function handleStatusChange(next: AdminRequestStatus) {
    setStatusValue(next);
    startTransition(async () => {
      const result = await setRequestStatusAction(detail.id, next);
      if (!result.success) {
        showToast(result.error ?? "تعذر تحديث حالة الطلب.", "error");
        setStatusValue(detail.status);
        return;
      }
      showToast("تم تحديث حالة الطلب — وتم إشعار صاحب الطلب.", "success");
      router.refresh();
    });
  }

  function handleToggleFeatured() {
    startTransition(async () => {
      const result = await setRequestFeaturedAction(detail.id, !detail.isFeatured);
      if (!result.success) {
        showToast(result.error ?? "تعذر تحديث حالة التمييز.", "error");
        return;
      }
      showToast(!detail.isFeatured ? "تم تمييز الطلب." : "تم إلغاء تمييز الطلب.", "success");
      router.refresh();
    });
  }

  async function handleDelete() {
    const confirmed = await confirm({
      title: "حذف هذا الطلب؟",
      message: "سيتم إخفاء الطلب من الموقع العام فوراً. يبقى محفوظاً في قاعدة البيانات ولا يُحذف نهائياً.",
      confirmLabel: "حذف",
      danger: true,
    });
    if (!confirmed) return;

    startTransition(async () => {
      const result = await softDeleteRequestAction(detail.id);
      if (!result.success) {
        showToast(result.error ?? "تعذر حذف الطلب.", "error");
        return;
      }
      showToast("تم حذف الطلب بنجاح.", "success");
      router.push("/admin/requests");
    });
  }

  function handleReportAction(reportId: string, reportStatus: "DISMISSED" | "RESOLVED" | "UNDER_REVIEW") {
    startTransition(async () => {
      const result = await setReportStatusAction(reportId, reportStatus);
      if (!result.success) {
        showToast(result.error ?? "تعذر تحديث حالة البلاغ.", "error");
        return;
      }
      showToast("تم تحديث حالة البلاغ.", "success");
      router.refresh();
    });
  }

  return (
    <div>
      <Link href="/admin/requests" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-600 hover:underline">
        <ArrowRight className="h-4 w-4" /> العودة إلى إدارة الطلبات
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-extrabold text-navy-950">{detail.title}</h1>
            {detail.isFeatured && <Star className="h-5 w-5 fill-amber-400 text-amber-400" />}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <RequestStatusBadge status={detail.status} />
            <span className="font-mono text-xs text-text-400" dir="ltr">{detail.id}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={status}
            disabled={isPending}
            onChange={(e) => handleStatusChange(e.target.value as AdminRequestStatus)}
            className="w-auto"
          >
            {SETTABLE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Button variant="outline" onClick={handleToggleFeatured} disabled={isPending}>
            <Star className="h-4 w-4" /> {detail.isFeatured ? "إلغاء التمييز" : "تمييز"}
          </Button>
          <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={handleDelete} disabled={isPending}>
            <Trash2 className="h-4 w-4" /> حذف
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h3 className="mb-3 font-display text-lg font-bold text-navy-950">تفاصيل الطلب</h3>
            <p className="whitespace-pre-line text-sm leading-relaxed text-text-700">{detail.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-text-400">التصنيف</p>
                <p className="font-semibold text-navy-950">{detail.categoryName}</p>
              </div>
              <div>
                <p className="text-xs text-text-400">الموقع</p>
                <p className="font-semibold text-navy-950">
                  {detail.cityName ?? "—"} · {detail.countryCode}
                </p>
              </div>
              {(detail.budgetMin || detail.budgetMax) && (
                <div>
                  <p className="text-xs text-text-400">الميزانية</p>
                  <p className="font-semibold text-navy-950" dir="ltr">
                    {detail.budgetMin ?? "—"} - {detail.budgetMax ?? "—"} {detail.currencyCode ?? ""}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-text-400">تاريخ الإنشاء</p>
                <p className="font-semibold text-navy-950">{new Date(detail.createdAt).toLocaleString("ar-SA")}</p>
              </div>
              <div>
                <p className="text-xs text-text-400">آخر تحديث</p>
                <p className="font-semibold text-navy-950">{new Date(detail.updatedAt).toLocaleString("ar-SA")}</p>
              </div>
              {detail.publishedAt && (
                <div>
                  <p className="text-xs text-text-400">تاريخ النشر</p>
                  <p className="font-semibold text-navy-950">{new Date(detail.publishedAt).toLocaleString("ar-SA")}</p>
                </div>
              )}
            </div>
          </Card>

          {detail.media.length > 0 && (
            <Card>
              <h3 className="mb-3 font-display text-lg font-bold text-navy-950">الصور والمرفقات</h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {detail.media.map((m) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={m.id}
                    src={m.url}
                    alt={m.altText ?? ""}
                    className="aspect-square w-full rounded-lg border border-border object-cover"
                  />
                ))}
              </div>
            </Card>
          )}

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-navy-950">البلاغات ({detail.reports.length.toLocaleString("ar")})</h3>
            </div>
            {detail.reports.length === 0 ? (
              <p className="text-sm text-text-400">لا توجد بلاغات على هذا الطلب.</p>
            ) : (
              <div className="space-y-3">
                {detail.reports.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-navy-950">{r.reason}</p>
                        <p className="text-xs text-text-400">
                          بواسطة {r.reporterName} · {new Date(r.createdAt).toLocaleDateString("ar-SA")}
                        </p>
                      </div>
                      <Badge tone={r.status === "RESOLVED" ? "success" : r.status === "DISMISSED" ? "neutral" : "warning"}>
                        {REPORT_STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                    </div>
                    {r.details && <p className="mt-2 text-sm text-text-700">{r.details}</p>}
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="ghost" disabled={isPending} onClick={() => handleReportAction(r.id, "DISMISSED")}>
                        تجاهل
                      </Button>
                      <Button size="sm" variant="ghost" disabled={isPending} onClick={() => handleReportAction(r.id, "UNDER_REVIEW")}>
                        إغلاق (قيد المراجعة)
                      </Button>
                      <Button size="sm" disabled={isPending} onClick={() => handleReportAction(r.id, "RESOLVED")}>
                        حل
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="mb-3 font-display text-lg font-bold text-navy-950">السجل الزمني للنشاط</h3>
            {detail.activity.length === 0 ? (
              <p className="text-sm text-text-400">لا توجد إجراءات إدارية مسجلة على هذا الطلب بعد.</p>
            ) : (
              <div className="space-y-3">
                {detail.activity.map((a) => (
                  <div key={a.id} className="border-r-2 border-teal-200 pr-3 text-sm">
                    <p className="font-semibold text-navy-950">{a.action}</p>
                    <p className="text-xs text-text-400">
                      {a.actorName} · {new Date(a.createdAt).toLocaleString("ar-SA")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="mb-3 font-display text-lg font-bold text-navy-950">صاحب الطلب</h3>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                <UserIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-navy-950">{detail.ownerName}</p>
                {detail.ownerEmail && <p className="text-xs text-text-400" dir="ltr">{detail.ownerEmail}</p>}
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Link
                href={`/admin/users?search=${encodeURIComponent(detail.ownerEmail ?? detail.ownerName)}`}
                className="flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> فتح ملف المستخدم
              </Link>
              <Link
                href={`/admin/requests?ownerId=${detail.ownerId}`}
                className="flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> كل طلبات هذا المستخدم
              </Link>
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 font-display text-lg font-bold text-navy-950">العروض</h3>
            <p className="text-2xl font-extrabold text-navy-950">{detail.offerCount.toLocaleString("ar")}</p>
            <Link
              href={`/admin/offers?requestId=${detail.id}`}
              className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> عرض كل العروض على هذا الطلب
            </Link>
            {detail.offers.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                {detail.offers.slice(0, 5).map((o) => (
                  <div key={o.id} className="flex items-center justify-between text-sm">
                    <span className="text-navy-950">{o.supplierName}</span>
                    <span className="text-text-400" dir="ltr">{o.price ?? "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {detail.reportCount > 0 && (
            <Card className="border-red-200 bg-red-50">
              <div className="flex items-center gap-2 text-red-700">
                <Flag className="h-5 w-5" />
                <p className="font-bold">{detail.reportCount.toLocaleString("ar")} بلاغ على هذا الطلب</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
