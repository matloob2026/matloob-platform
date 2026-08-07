/**
 * OfferService
 * ============
 * Suppliers respond to a Request with an Offer. Accepting an offer is a
 * cross-entity transaction (Offer -> ACCEPTED, Request -> IN_PROGRESS,
 * a Conversation is opened, other pending offers are left untouched so
 * the buyer can still change their mind) — that orchestration belongs
 * here, not in a route handler or a component.
 *
 * IMPLEMENTATION STATUS: was a Phase 1 stub (every method threw "Not
 * yet implemented"). Now a real Prisma-backed implementation —
 * create, accept, reject, withdraw, listForRequest, listMine — same
 * pattern as RequestService (typed `OfferServiceError` + a single
 * error->HTTP-status mapper reused by every route under
 * src/app/api/offers, ownership checked in the service so a route
 * handler can't accidentally skip it).
 *
 * NOTE ON VERIFICATION: same sandbox limitation documented in
 * src/services/auth.service.ts / request.service.ts — `npx prisma
 * generate` cannot complete here because the network proxy blocks
 * binaries.prisma.sh. This code is written directly against the real
 * schema (see prisma/schema.prisma's Offer/Request/Conversation
 * models) and is expected to run as-is once `prisma generate` +
 * `prisma migrate deploy` succeed with real network access.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requestService, toLocalized } from "@/services/request.service";
import { notificationService } from "@/services/notification.service";
import type { Offer, OfferStatus, OfferWithRequest, Paginated, RequestStatus } from "@/types/domain";

// ---------------------------------------------------------------------
// Errors — typed so API routes can map each one to the right HTTP
// status without string-matching messages (same pattern as
// RequestServiceError).
// ---------------------------------------------------------------------

export class OfferServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "VALIDATION_ERROR"
      | "ALREADY_EXISTS"
      | "INVALID_STATUS_TRANSITION"
  ) {
    super(message);
    this.name = "OfferServiceError";
  }
}

/** Single source of truth for OfferServiceError -> HTTP status, shared
 * by every route under src/app/api/offers so they don't each
 * re-implement the same switch statement. */
export function offerServiceErrorStatus(code: OfferServiceError["code"]): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "FORBIDDEN":
      return 403;
    case "ALREADY_EXISTS":
      return 409;
    case "INVALID_STATUS_TRANSITION":
      return 409;
    case "VALIDATION_ERROR":
    default:
      return 400;
  }
}

// ---------------------------------------------------------------------
// Input / output contracts
// ---------------------------------------------------------------------

export interface CreateOfferInput {
  requestId: string;
  supplierId: string;
  message: string;
  price?: number;
}

/**
 * Offers Integration phase: partial update for an existing PENDING
 * offer's message/price — the supplier corrects or improves their
 * offer without withdrawing and resubmitting (which would lose their
 * place and reset `createdAt`). Both fields optional/independent, same
 * "only send what changed" convention as UpdateRequestInput.
 */
export interface UpdateOfferInput {
  message?: string;
  price?: number | null;
}

export interface ListMyOffersFilter {
  status?: OfferStatus;
  page?: number;
  pageSize?: number;
}

export interface OfferService {
  create(input: CreateOfferInput): Promise<Offer>;
  /**
   * Offers Integration phase: supplier-only edit of their own PENDING
   * offer — same record, no new row created (schema's
   * `@@unique([requestId, supplierId])` means there could never be a
   * second one anyway). Rejected once the offer is no longer PENDING,
   * same reasoning as `withdraw`.
   */
  update(offerId: string, supplierId: string, input: UpdateOfferInput): Promise<Offer>;
  accept(offerId: string, buyerId: string): Promise<Offer>;
  reject(offerId: string, buyerId: string): Promise<Offer>;
  withdraw(offerId: string, supplierId: string): Promise<Offer>;
  listForRequest(requestId: string, status?: OfferStatus): Promise<Offer[]>;
  /**
   * Offers module (Stage 1): the supplier-facing "عروضي" dashboard
   * page — every offer the given supplier has ever submitted, newest
   * first, across every request. Not part of the original Phase 1
   * interface; purely additive (nothing else implemented/called
   * `OfferService` before this, so there is no existing caller to
   * break).
   */
  listMine(supplierId: string, filter?: ListMyOffersFilter): Promise<Paginated<OfferWithRequest>>;

  /**
   * Offer Details page: a single offer plus its owning request's
   * id/title/status (same `OfferWithRequest` shape `listMine` already
   * returns) — the page itself enforces "viewer must be the request's
   * owner OR this offer's supplier" since that check needs the
   * request's ownerId, which this method deliberately doesn't select
   * (keeps this a plain data fetch, not an authorization decision).
   */
  getById(offerId: string): Promise<OfferWithRequest | null>;
}

// ---------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------

function offerInclude() {
  return {
    supplier: { include: { profile: { include: { avatar: true } } } },
  } as const;
}

type OfferRow = Awaited<ReturnType<typeof findOfferRow>>;

/** Row shape for `listMine`/`getById` below — `offerInclude()` plus
 * the owning request's id/title/status/city/media, matching
 * `OfferWithRequest`'s extra `request` field (see
 * src/types/domain.ts). Declared explicitly rather than inferred from
 * the query, the same way `OfferRow` above is derived from
 * `findOfferRow` — keeps this file's typing style consistent even
 * though the specific inference path differs. */
type MyOfferRow = NonNullable<OfferRow> & {
  request: {
    id: string;
    title: string;
    status: RequestStatus;
    city: { id: string; translations: { locale: string; name: string }[] } | null;
    media: { url: string }[];
  };
};

/** Shared `request` sub-select for `listMine`/`getById` — city
 * (for localized display) and the first cover image only (same
 * "media[0]" convention `mapToSummary` uses in request.service.ts),
 * not the full request record. */
function offerRequestSelect() {
  return {
    id: true,
    title: true,
    status: true,
    city: { include: { translations: true } },
    media: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } },
  } as const;
}

/** Maps `MyOfferRow.request` onto `OfferWithRequest["request"]` —
 * reuses `toLocalized` (exported from request.service.ts) so the
 * city name resolves the exact same way every other page in the app
 * resolves a city's localized name. */
function mapOfferRequest(request: MyOfferRow["request"]): OfferWithRequest["request"] {
  return {
    id: request.id,
    title: request.title,
    status: request.status,
    city: request.city ? { id: request.city.id, name: toLocalized(request.city.translations) } : undefined,
    coverImageUrl: request.media[0]?.url,
  };
}

async function findOfferRow(id: string) {
  return prisma.offer.findFirst({
    where: { id, deletedAt: null },
    include: offerInclude(),
  });
}

function mapToOffer(row: NonNullable<OfferRow>): Offer {
  return {
    id: row.id,
    requestId: row.requestId,
    supplier: {
      id: row.supplier.id,
      displayName: row.supplier.profile?.displayName ?? row.supplier.email ?? "مستخدم مطلوب",
      avatarUrl: row.supplier.profile?.avatar?.url,
      isVerifiedSupplier: row.supplier.profile?.isVerifiedSupplier ?? false,
      ratingAvg: row.supplier.profile?.ratingAvg ?? 0,
      ratingCount: row.supplier.profile?.ratingCount ?? 0,
    },
    message: row.message,
    price: row.price ? Number(row.price) : undefined,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

// Statuses a request must be in to still accept new offers — same
// spirit as RequestService's PUBLICLY_VISIBLE_STATUSES, but narrower:
// an IN_PROGRESS request already accepted one offer and shouldn't
// silently collect more.
const OFFERABLE_REQUEST_STATUSES = ["PUBLISHED"] as const;

export class PrismaOfferService implements OfferService {
  async create(input: CreateOfferInput): Promise<Offer> {
    const message = input.message.trim();
    if (!message) {
      throw new OfferServiceError("الرجاء كتابة رسالة مع العرض.", "VALIDATION_ERROR");
    }
    if (input.price != null && input.price < 0) {
      throw new OfferServiceError("السعر غير صالح.", "VALIDATION_ERROR");
    }

    const request = await prisma.request.findFirst({
      where: { id: input.requestId, deletedAt: null },
      select: { id: true, ownerId: true, status: true },
    });
    if (!request) {
      throw new OfferServiceError("الطلب غير موجود.", "NOT_FOUND");
    }
    if (request.ownerId === input.supplierId) {
      throw new OfferServiceError("لا يمكنك تقديم عرض على طلبك الخاص.", "FORBIDDEN");
    }
    if (!OFFERABLE_REQUEST_STATUSES.includes(request.status as (typeof OFFERABLE_REQUEST_STATUSES)[number])) {
      throw new OfferServiceError("لا يمكن تقديم عروض على هذا الطلب حاليًا.", "INVALID_STATUS_TRANSITION");
    }

    // Schema enforces `@@unique([requestId, supplierId])` — one offer
    // per supplier per request, ever (matches the "one active offer"
    // comment on the Offer model). Check first so a duplicate attempt
    // gets a clean, typed error instead of a raw Prisma P2002.
    const existing = await prisma.offer.findUnique({
      where: { requestId_supplierId: { requestId: input.requestId, supplierId: input.supplierId } },
      select: { id: true, deletedAt: true },
    });
    if (existing && !existing.deletedAt) {
      throw new OfferServiceError("لقد قدمت عرضًا على هذا الطلب من قبل.", "ALREADY_EXISTS");
    }

    const created = await prisma.offer.create({
      data: {
        requestId: input.requestId,
        supplierId: input.supplierId,
        message,
        price: input.price,
      },
      include: offerInclude(),
    });

    await requestService.syncOfferCount(input.requestId);

    await notificationService.notify({
      userId: request.ownerId,
      type: "NEW_OFFER",
      title: "عرض جديد على طلبك",
      body: "تلقى طلبك عرضًا جديدًا من أحد الموردين.",
      linkUrl: `/requests/${input.requestId}`,
      metadata: { requestId: input.requestId, offerId: created.id },
    });

    return mapToOffer(created);
  }

  async update(offerId: string, supplierId: string, input: UpdateOfferInput): Promise<Offer> {
    const offer = await prisma.offer.findFirst({ where: { id: offerId, deletedAt: null } });
    if (!offer) {
      throw new OfferServiceError("العرض غير موجود.", "NOT_FOUND");
    }
    if (offer.supplierId !== supplierId) {
      throw new OfferServiceError("لا تملك صلاحية تعديل هذا العرض.", "FORBIDDEN");
    }
    if (offer.status !== "PENDING") {
      throw new OfferServiceError("لا يمكن تعديل عرض تم البت فيه.", "INVALID_STATUS_TRANSITION");
    }

    const data: { message?: string; price?: number | null } = {};

    if (input.message !== undefined) {
      const message = input.message.trim();
      if (!message) {
        throw new OfferServiceError("الرجاء كتابة رسالة مع العرض.", "VALIDATION_ERROR");
      }
      data.message = message;
    }

    if (input.price !== undefined) {
      if (input.price != null && input.price < 0) {
        throw new OfferServiceError("السعر غير صالح.", "VALIDATION_ERROR");
      }
      data.price = input.price;
    }

    if (Object.keys(data).length > 0) {
      await prisma.offer.update({ where: { id: offerId }, data });
    }

    const updated = await findOfferRow(offerId);
    return mapToOffer(updated!);
  }

  async accept(offerId: string, buyerId: string): Promise<Offer> {
    const offer = await prisma.offer.findFirst({
      where: { id: offerId, deletedAt: null },
      include: { request: { select: { id: true, ownerId: true, status: true } } },
    });
    if (!offer) {
      throw new OfferServiceError("العرض غير موجود.", "NOT_FOUND");
    }
    if (offer.request.ownerId !== buyerId) {
      throw new OfferServiceError("لا تملك صلاحية قبول هذا العرض.", "FORBIDDEN");
    }
    if (offer.status !== "PENDING") {
      throw new OfferServiceError("تم البت في هذا العرض من قبل.", "INVALID_STATUS_TRANSITION");
    }

    const requestId = offer.requestId;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.offer.update({ where: { id: offerId }, data: { status: "ACCEPTED" } });
      await tx.request.update({ where: { id: requestId }, data: { status: "IN_PROGRESS" } });

      // Open (or reuse, if one already exists for this offer) the
      // conversation between buyer and supplier — Conversation.offerId
      // is @unique, so this is safe to call at most once per offer.
      const conversation = await tx.conversation.upsert({
        where: { offerId },
        create: { requestId, offerId },
        update: {},
      });
      await tx.conversationParticipant.createMany({
        data: [
          { conversationId: conversation.id, userId: buyerId },
          { conversationId: conversation.id, userId: offer.supplierId },
        ],
        skipDuplicates: true,
      });
    });

    await notificationService.notify({
      userId: offer.supplierId,
      type: "OFFER_ACCEPTED",
      title: "تم قبول عرضك",
      body: "قام صاحب الطلب بقبول عرضك. يمكنك الآن التواصل معه مباشرة.",
      linkUrl: `/requests/${requestId}`,
      metadata: { requestId, offerId },
    });

    const updated = await findOfferRow(offerId);
    return mapToOffer(updated!);
  }

  async reject(offerId: string, buyerId: string): Promise<Offer> {
    const offer = await prisma.offer.findFirst({
      where: { id: offerId, deletedAt: null },
      include: { request: { select: { id: true, ownerId: true } } },
    });
    if (!offer) {
      throw new OfferServiceError("العرض غير موجود.", "NOT_FOUND");
    }
    if (offer.request.ownerId !== buyerId) {
      throw new OfferServiceError("لا تملك صلاحية رفض هذا العرض.", "FORBIDDEN");
    }
    if (offer.status !== "PENDING") {
      throw new OfferServiceError("تم البت في هذا العرض من قبل.", "INVALID_STATUS_TRANSITION");
    }

    await prisma.offer.update({ where: { id: offerId }, data: { status: "REJECTED" } });

    await notificationService.notify({
      userId: offer.supplierId,
      type: "OFFER_REJECTED",
      title: "تم رفض عرضك",
      body: "قام صاحب الطلب برفض عرضك على هذا الطلب.",
      linkUrl: `/requests/${offer.requestId}`,
      metadata: { requestId: offer.requestId, offerId },
    });

    const updated = await findOfferRow(offerId);
    return mapToOffer(updated!);
  }

  async withdraw(offerId: string, supplierId: string): Promise<Offer> {
    const offer = await prisma.offer.findFirst({ where: { id: offerId, deletedAt: null } });
    if (!offer) {
      throw new OfferServiceError("العرض غير موجود.", "NOT_FOUND");
    }
    if (offer.supplierId !== supplierId) {
      throw new OfferServiceError("لا تملك صلاحية سحب هذا العرض.", "FORBIDDEN");
    }
    if (offer.status !== "PENDING") {
      throw new OfferServiceError("لا يمكن سحب هذا العرض في حالته الحالية.", "INVALID_STATUS_TRANSITION");
    }

    await prisma.offer.update({ where: { id: offerId }, data: { status: "WITHDRAWN" } });
    await requestService.syncOfferCount(offer.requestId);

    const updated = await findOfferRow(offerId);
    return mapToOffer(updated!);
  }

  async listForRequest(requestId: string, status?: OfferStatus): Promise<Offer[]> {
    const rows = await prisma.offer.findMany({
      where: { requestId, deletedAt: null, ...(status ? { status } : {}) },
      include: offerInclude(),
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r: NonNullable<OfferRow>) => mapToOffer(r));
  }

  async listMine(supplierId: string, filter: ListMyOffersFilter = {}): Promise<Paginated<OfferWithRequest>> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const where = {
      supplierId,
      deletedAt: null,
      ...(filter.status ? { status: filter.status } : {}),
    };

    const include = {
      ...offerInclude(),
      request: { select: offerRequestSelect() },
    } as const;

    const [rows, totalItems] = await Promise.all([
      prisma.offer.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.offer.count({ where }),
    ]);

    return {
      items: (rows as MyOfferRow[]).map((r) => ({
        ...mapToOffer(r),
        request: mapOfferRequest(r.request),
      })),
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    };
  }

  async getById(offerId: string): Promise<OfferWithRequest | null> {
    const row = await prisma.offer.findFirst({
      where: { id: offerId, deletedAt: null },
      include: {
        ...offerInclude(),
        request: { select: offerRequestSelect() },
      },
    });
    if (!row) return null;

    const typed = row as MyOfferRow;
    return {
      ...mapToOffer(typed),
      request: mapOfferRequest(typed.request),
    };
  }
}

export const offerService = new PrismaOfferService();
