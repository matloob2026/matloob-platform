import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth/auth";
import { requestService } from "@/services/request.service";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RequestStatusBadge } from "@/components/requests/RequestStatusBadge";
import { RequestOwnerActions } from "@/components/requests/RequestOwnerActions";

export const metadata: Metadata = {
  title: "طلباتي | مطلوب",
};

export default async function MyRequestsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/my-requests");
  }

  const { items, totalItems } = await requestService.listMine(session.user.id, { pageSize: 50 });

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-navy-950 sm:text-3xl">
              طلباتي
            </h1>
            <p className="mt-1 text-sm text-text-500">
              {totalItems > 0 ? `لديك ${totalItems} طلب` : "لا توجد طلبات بعد"}
            </p>
          </div>
          <Link href="/create-request">
            <Button size="sm">+ طلب جديد</Button>
          </Link>
        </div>

        {items.length === 0 ? (
          <Card className="text-center text-sm text-text-500">
            لم تنشئ أي طلب حتى الآن. ابدأ الآن بنشر ما تحتاجه!
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((r) => (
              <Card key={r.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/requests/${r.id}`}
                      className="font-display text-base font-extrabold text-navy-950 hover:text-teal-700"
                    >
                      {r.title}
                    </Link>
                    <p className="mt-1 text-xs text-text-400">
                      {r.category.name.current}
                      {r.city ? ` · ${r.city.name.current}` : ""} · {r.offerCount} عرض
                    </p>
                  </div>
                  <RequestStatusBadge status={r.status} />
                </div>
                <RequestOwnerActions requestId={r.id} status={r.status} />
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
