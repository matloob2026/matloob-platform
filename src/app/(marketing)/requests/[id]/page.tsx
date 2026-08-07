import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth/auth";
import { requestService } from "@/services/request.service";
import { offerService } from "@/services/offer.service";
import { Card } from "@/components/ui/Card";
import { RequestStatusBadge } from "@/components/requests/RequestStatusBadge";
import { RequestOwnerActions } from "@/components/requests/RequestOwnerActions";
import { RequestImageManager } from "@/components/media/RequestImageManager";
import { OffersList } from "@/components/offers/OffersList";
import { SendOfferForm } from "@/components/offers/SendOfferForm";
import { MyOfferStatusCard } from "@/components/offers/MyOfferStatusCard";
import Image from "next/image";
import { SiteHeader } from "@/components/layout/SiteHeader";
import type { RequestStatus } from "@/types/domain";

/** Statuses visible to anyone other than the request's own owner —
 * everything a published request can still become later in its
 * lifecycle (in progress, fulfilled, expired, closed) stays visible;
 * a draft, a pending-review submission, or something an admin
 * rejected/removed is only ever visible to its owner. */
const PUBLICLY_VISIBLE_STATUSES: RequestStatus[] = [
  "PUBLISHED",
  "IN_PROGRESS",
  "FULFILLED",
  "EXPIRED",
  "CLOSED_BY_BUYER",
];

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

  // Offers module (Stage 1): the owner sees every offer on their
  // request; a signed-in non-owner sees only their own (if any) — see
  // OffersList / SendOfferForm / MyOfferStatusCard for the render
  // branches below. Only fetched when there's actually a viewer who
  // could see something, to avoid the query for an anonymous visitor.
  const requestOffers = isOwner
    ? await offerService.listForRequest(found.id)
    : [];
  const myOffer =
    !isOwner && session?.user?.id
      ? (await offerService.listForRequest(found.id)).find((o) => o.supplier.id === session.user!.id)
      : undefined;

  // Same visibility rule as GET /api/requests/[id], extended to cover
  // every status that isn't meant to be publicly visible yet (or
  // anymore) — a draft, a pending-review submission, or something an
  // admin rejected/removed stays owner-only; every other status
  // (published and everything further along its lifecycle) is
  // visible to anyone.
  if (!isOwner && !PUBLICLY_VISIBLE_STATUSES.includes(found.status)) notFound();

  const similarPage = await requestService.list({
    countryId: found.country.id,
    categoryId: found.category.id,
    pageSize: 4,
  });
  const similarRequests = similarPage.items.filter((r) => r.id !== found.id).slice(0, 3);

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <SiteHeader title={found.title} />
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

        {found.media.length > 0 && (
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

        {(found.contact.phoneVisible || found.contact.whatsappVisible || found.contact.emailVisible) && (
          <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm">
            <p className="mb-2 font-bold text-navy-950">معلومات التواصل</p>
            <div className="space-y-1.5">
              {found.contact.phoneVisible && found.contact.phone && (
                <p>
                  <span className="text-text-500">الجوال: </span>
                  <a href={`tel:${found.contact.phone}`} className="font-semibold text-teal-700" dir="ltr">
                    {found.contact.phone}
                  </a>
                </p>
              )}
              {found.contact.whatsappVisible && found.contact.whatsapp && (
                <p>
                  <span className="text-text-500">واتساب: </span>
                  <a
                    href={`https://wa.me/${found.contact.whatsapp.replace(/[^0-9]/g, "")}`}
                    className="font-semibold text-teal-700"
                    dir="ltr"
                  >
                    {found.contact.whatsapp}
                  </a>
                </p>
              )}
              {found.contact.emailVisible && found.contact.email && (
                <p>
                  <span className="text-text-500">البريد الإلكتروني: </span>
                  <a href={`mailto:${found.contact.email}`} className="font-semibold text-teal-700" dir="ltr">
                    {found.contact.email}
                  </a>
                </p>
              )}
            </div>
          </div>
        )}

        {isOwner && <RequestOwnerActions requestId={found.id} status={found.status} />}
        {isOwner && <RequestImageManager requestId={found.id} initialImages={found.media} />}
      </Card>

      <div className="mx-auto mt-4 max-w-2xl">
        {isOwner && <OffersList offers={requestOffers} />}
        {!isOwner && myOffer && <MyOfferStatusCard offer={myOffer} />}
        {!isOwner && !myOffer && session?.user?.id && found.status === "PUBLISHED" && (
          <SendOfferForm requestId={found.id} />
        )}
        {!isOwner && !session?.user?.id && found.status === "PUBLISHED" && (
          <Card className="mt-4 text-center text-sm text-text-500">
            <a href={`/login?callbackUrl=/requests/${found.id}`} className="font-bold text-teal-700 hover:underline">
              سجّل الدخول
            </a>{" "}
            لتقديم عرض على هذا الطلب.
          </Card>
        )}
      </div>

      {similarRequests.length > 0 && (
        <div className="mx-auto mt-8 max-w-2xl">
          <h2 className="mb-4 font-display text-lg font-bold text-navy-950">طلبات مشابهة</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {similarRequests.map((r) => (
              <Link key={r.id} href={`/requests/${r.id}`} className="block">
                <Card className="h-full transition hover:shadow-card-lg">
                  {r.coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.coverImageUrl} alt={r.title} className="mb-3 h-28 w-full rounded-lg object-cover" />
                  )}
                  <p className="text-sm font-bold text-navy-950">{r.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-text-500">{r.description}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
