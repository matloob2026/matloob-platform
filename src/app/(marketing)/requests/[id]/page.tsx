import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth/auth";
import { requestService } from "@/services/request.service";
import { Card } from "@/components/ui/Card";
import { RequestStatusBadge } from "@/components/requests/RequestStatusBadge";
import { RequestOwnerActions } from "@/components/requests/RequestOwnerActions";
import { RequestImageManager } from "@/components/media/RequestImageManager";
import Image from "next/image";
import { SiteHeader } from "@/components/layout/SiteHeader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const found = await requestService.getById(id);
  return { title: found ? `${found.title} | مطلوب` : "الطلب غير موجود | مطلوب" };
}

function formatBudget(min?: number, max?: number, symbol?: string): string {
  if (min == null && max == null) return "غير محددة";
  const s = symbol ?? "";
  if (min != null && max != null) return `${min} - ${max} ${s}`.trim();
  if (min != null) return `من ${min} ${s}`.trim();
  return `حتى ${max} ${s}`.trim();
}

export default async function RequestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const found = await requestService.getById(id);
  if (!found) notFound();

  const session = await auth();
  const isOwner = session?.user?.id === found.owner.id;

  // Same visibility rule as GET /api/requests/[id]: a draft is only
  // visible to its own owner.
  if (found.status === "DRAFT" && !isOwner) notFound();

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <SiteHeader />
      <Card className="mx-auto max-w-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h1 className="font-display text-xl font-extrabold text-navy-950 sm:text-2xl">
            {found.title}
          </h1>
          <RequestStatusBadge status={found.status} />
        </div>

        <p className="text-xs text-text-400">
          {found.category.name.current}
          {found.city ? ` · ${found.city.name.current}` : ""}
        </p>

        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-text-700">
          {found.description}
        </p>

        {!isOwner && found.media.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {found.media.map((img) => (
              <div
                key={img.id}
                className="relative h-24 w-full overflow-hidden rounded-lg border border-border sm:h-28"
              >
                <Image
                  src={img.url}
                  alt={img.altText ?? found.title}
                  fill
                  loading="lazy"
                  sizes="(max-width: 640px) 33vw, 25vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg bg-surface-muted p-4 text-sm">
          <div>
            <dt className="text-text-400">الميزانية</dt>
            <dd className="font-bold text-navy-950">
              {formatBudget(found.budgetMin, found.budgetMax, found.currency?.symbol)}
            </dd>
          </div>
          <div>
            <dt className="text-text-400">عدد العروض</dt>
            <dd className="font-bold text-navy-950">{found.offerCount}</dd>
          </div>
          <div>
            <dt className="text-text-400">صاحب الطلب</dt>
            <dd className="font-bold text-navy-950">{found.owner.displayName}</dd>
          </div>
          <div>
            <dt className="text-text-400">تاريخ النشر</dt>
            <dd className="font-bold text-navy-950">
              {found.publishedAt ? new Date(found.publishedAt).toLocaleDateString("ar-SA") : "—"}
            </dd>
          </div>
        </dl>

        {isOwner && <RequestOwnerActions requestId={found.id} status={found.status} />}
        {isOwner && <RequestImageManager requestId={found.id} initialImages={found.media} />}
      </Card>
    </main>
  );
}
