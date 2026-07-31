import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Card } from "@/components/ui/Card";
import { requestService } from "@/services/request.service";

/**
 * Public "browse all requests" listing — Requests polish pass. The
 * destination for the homepage's "عرض جميع الطلبات" button and the
 * nav's "تصفح الطلبات" links (neither had a real destination before).
 * Reuses the existing `requestService.listAllPublished` (added to the
 * SAME service, not a new one) and the same SiteHeader/Card public-
 * page template already used elsewhere on the site.
 *
 * Every PUBLISHED request appears — Featured is a priority/ordering
 * flag only (featured requests sort first), never a visibility
 * filter, matching the exact same rule the homepage section follows.
 */

export const metadata: Metadata = {
  title: "كل الطلبات | مطلوب",
  description: "تصفح كل الطلبات المنشورة على منصة مطلوب.",
};

export default async function AllRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const result = await requestService.listAllPublished(page, 12);

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <SiteHeader title="كل الطلبات" />
      <div className="mx-auto mb-8 max-w-5xl text-center">
        <h1 className="font-display text-2xl font-extrabold text-navy-950 sm:text-3xl">كل الطلبات</h1>
        <p className="mt-2 text-sm text-text-500">تصفح كل الطلبات المنشورة حالياً على مطلوب.</p>
      </div>

      <div className="mx-auto max-w-5xl">
        {result.items.length === 0 ? (
          <Card>
            <p className="text-center text-sm text-text-500">لا توجد طلبات منشورة حالياً.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((r) => (
              <Link key={r.id} href={`/requests/${r.id}`} className="block">
                <Card className="h-full transition hover:shadow-card-lg">
                  {r.coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.coverImageUrl} alt={r.title} className="mb-3 h-32 w-full rounded-lg object-cover" />
                  )}
                  <p className="text-xs text-text-400">
                    {r.category.name.current}
                    {r.city ? ` · ${r.city.name.current}` : ""}
                  </p>
                  <p className="mt-1 font-bold text-navy-950">{r.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-text-500">{r.description}</p>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {result.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/requests?page=${page - 1}`}
                className="rounded-lg border border-border-strong px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-white"
              >
                السابق
              </Link>
            )}
            <span className="px-3 text-sm text-text-500">
              صفحة {page.toLocaleString("ar")} من {result.totalPages.toLocaleString("ar")}
            </span>
            {page < result.totalPages && (
              <Link
                href={`/requests?page=${page + 1}`}
                className="rounded-lg border border-border-strong px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-white"
              >
                التالي
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
