/**
 * RequestService
 * ==============
 * Owns all reads/writes for the platform's core entity: the buyer's
 * published Request. This is where "create request, get offers" logic
 * lives — never inline in an API route handler.
 *
 * Route handlers (src/app/api/requests/**) should be thin: parse input,
 * call this service, map the result to an HTTP response. This keeps
 * business logic testable without spinning up Next.js.
 *
 * IMPLEMENTATION STATUS: Phase 3 — Part 2 (Request Management
 * foundation). Real Prisma-backed implementation covering create,
 * edit, delete (soft), "my requests", request detail, and status
 * transitions (publish/close). Every write is scoped to `ownerId` so a
 * request can only ever be created, edited, or removed by the
 * authenticated user who owns it — see each method's `ownerId` check.
 *
 * NOTE ON VERIFICATION: same sandbox limitation documented in
 * src/services/auth.service.ts — `npx prisma generate` cannot
 * complete here because the network proxy blocks binaries.prisma.sh.
 * This code is written directly against the real schema (see
 * prisma/schema.prisma's Request/Category/Country/City/Currency
 * models) and is expected to run as-is once `prisma generate` +
 * `prisma migrate deploy` succeed with real network access — same
 * status as AuthService. See tests/integration/request-flow.e2e.test.ts.
 *
 * AI hook points (`aiSuggestedCategoryId`, `aiQualityScore` on
 * Request) and the supplier-notification-on-publish hook are
 * deliberately left as TODOs below — out of scope for this phase,
 * which is CRUD + ownership + status only.
 */

import { prisma } from "@/lib/prisma";
import type {
  Paginated,
  RequestDetail,
  RequestSummary,
  RequestStatus,
  Localized,
  Locale,
} from "@/types/domain";

// ---------------------------------------------------------------------
// Errors — typed so API routes can map each one to the right HTTP
// status without string-matching messages (same pattern as AuthError).
// ---------------------------------------------------------------------

export class RequestServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "FORBIDDEN" | "VALIDATION_ERROR" | "INVALID_STATUS_TRANSITION"
  ) {
    super(message);
    this.name = "RequestServiceError";
  }
}

/** Single source of truth for RequestServiceError -> HTTP status,
 * shared by every route under src/app/api/requests so they don't each
 * re-implement the same switch statement. */
export function requestServiceErrorStatus(code: RequestServiceError["code"]): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "FORBIDDEN":
      return 403;
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

export interface CreateRequestInput {
  ownerId: string;
  categoryId: string;
  countryId: string;
  cityId?: string;
  currencyId?: string;
  title: string;
  description: string;
  budgetMin?: number;
  budgetMax?: number;
  mediaIds?: string[];
  /** Defaults to true — this platform's UX is "publish a need
   * immediately", not a multi-step draft workflow. Set to false for a
   * save-as-draft flow if one is added later; `publish()` below still
   * exists for that path. */
  publishImmediately?: boolean;
}

export interface UpdateRequestInput {
  categoryId?: string;
  cityId?: string;
  currencyId?: string;
  title?: string;
  description?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
}

export interface ListRequestsFilter {
  categoryId?: string;
  countryId: string; // always scoped to a country — never a global query
  cityId?: string;
  status?: RequestStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListMyRequestsFilter {
  status?: RequestStatus;
  page?: number;
  pageSize?: number;
}

export interface RequestService {
  create(input: CreateRequestInput): Promise<RequestDetail>;
  update(requestId: string, ownerId: string, input: UpdateRequestInput): Promise<RequestDetail>;
  remove(requestId: string, ownerId: string): Promise<void>;
  publish(requestId: string, ownerId: string): Promise<RequestDetail>;
  getById(requestId: string): Promise<RequestDetail | null>;
  list(filter: ListRequestsFilter): Promise<Paginated<RequestSummary>>;
  listMine(ownerId: string, filter?: ListMyRequestsFilter): Promise<Paginated<RequestSummary>>;
  close(requestId: string, ownerId: string): Promise<void>;

  /**
   * Increments the denormalized `offerCount` on Request whenever an
   * Offer is created/withdrawn. Called by OfferService, never invoked
   * directly from a route handler — keeps the counter's single writer
   * obvious and prevents drift.
   */
  syncOfferCount(requestId: string): Promise<void>;
}

// ---------------------------------------------------------------------
// Localization helper — no shared LocalizationService exists yet in the
// codebase (homepage-content.service.ts is still a Phase 3+ TODO
// itself), so this is a small, self-contained resolver scoped to this
// file rather than a new cross-cutting module. Resolves a translation
// row array into the `Localized` shape the domain types expect.
// ---------------------------------------------------------------------

const DEFAULT_LOCALE: Locale = "ar";

function toLocalized(translations: { locale: string; name: string }[]): Localized {
  const preferred = translations.find((t) => t.locale === DEFAULT_LOCALE);
  const current = preferred?.name ?? translations[0]?.name ?? "";
  return {
    current,
    translations: translations.map((t) => ({ locale: t.locale as Locale, value: t.name })),
  };
}

// Shape returned by the Prisma query below — kept local since it's an
// internal mapping detail, not part of the public service contract.
type RequestRow = Awaited<ReturnType<typeof findRequestRow>>;

function requestInclude() {
  return {
    category: { include: { translations: true } },
    country: true,
    city: { include: { translations: true } },
    currency: true,
    owner: { include: { profile: { include: { avatar: true } } } },
    media: true,
  } as const;
}

async function findRequestRow(id: string) {
  return prisma.request.findFirst({
    where: { id, deletedAt: null },
    include: requestInclude(),
  });
}

function mapToSummary(row: NonNullable<RequestRow>): RequestSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: {
      id: row.category.id,
      slug: row.category.slug,
      name: toLocalized(row.category.translations),
    },
    city: row.city
      ? { id: row.city.id, name: toLocalized(row.city.translations) }
      : undefined,
    country: { id: row.country.id, code: row.country.code },
    budgetMin: row.budgetMin ? Number(row.budgetMin) : undefined,
    budgetMax: row.budgetMax ? Number(row.budgetMax) : undefined,
    currency: row.currency ? { code: row.currency.code, symbol: row.currency.symbol } : undefined,
    coverImageUrl: row.media[0]?.url,
    offerCount: row.offerCount,
    status: row.status,
    publishedAt: row.publishedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function mapToDetail(row: NonNullable<RequestRow>): RequestDetail {
  return {
    ...mapToSummary(row),
    owner: {
      id: row.owner.id,
      displayName: row.owner.profile?.displayName ?? row.owner.email ?? "مستخدم مطلوب",
      avatarUrl: row.owner.profile?.avatar?.url,
      isVerifiedSupplier: row.owner.profile?.isVerifiedSupplier ?? false,
      ratingAvg: row.owner.profile?.ratingAvg ?? 0,
      ratingCount: row.owner.profile?.ratingCount ?? 0,
    },
    media: row.media.map((m: { id: string; url: string; altText: string | null }) => ({
      id: m.id,
      url: m.url,
      altText: m.altText ?? undefined,
    })),
    expiresAt: row.expiresAt?.toISOString(),
  };
}

// Status transitions a request owner is allowed to make themselves.
// (REMOVED_BY_ADMIN is deliberately not reachable from here — that's
// an admin-only action, out of scope for this service.)
const PUBLISHABLE_FROM: RequestStatus[] = ["DRAFT"];
const CLOSABLE_FROM: RequestStatus[] = ["PUBLISHED", "IN_PROGRESS"];
const EDITABLE_FROM: RequestStatus[] = ["DRAFT", "PUBLISHED"];

export class PrismaRequestService implements RequestService {
  async create(input: CreateRequestInput): Promise<RequestDetail> {
    if (!input.title.trim() || !input.description.trim()) {
      throw new RequestServiceError("Title and description are required.", "VALIDATION_ERROR");
    }
    if (
      input.budgetMin !== undefined &&
      input.budgetMax !== undefined &&
      input.budgetMin > input.budgetMax
    ) {
      throw new RequestServiceError(
        "Minimum budget cannot be greater than maximum budget.",
        "VALIDATION_ERROR"
      );
    }

    const publishImmediately = input.publishImmediately ?? true;
    const now = new Date();

    const created = await prisma.request.create({
      data: {
        ownerId: input.ownerId,
        categoryId: input.categoryId,
        countryId: input.countryId,
        cityId: input.cityId,
        currencyId: input.currencyId,
        title: input.title.trim(),
        description: input.description.trim(),
        budgetMin: input.budgetMin,
        budgetMax: input.budgetMax,
        status: publishImmediately ? "PUBLISHED" : "DRAFT",
        publishedAt: publishImmediately ? now : undefined,
        media: input.mediaIds?.length ? { connect: input.mediaIds.map((id) => ({ id })) } : undefined,
      },
      select: { id: true },
    });

    // TODO (post-foundation, AI layer): call src/ai/categorization here
    // to populate `aiSuggestedCategoryId` when the buyer's chosen
    // category confidence is low. Not implemented — out of scope for
    // this phase, which is CRUD + ownership + status only.
    // TODO (post-foundation): on successful publish, emit a
    // NotificationService event so suppliers watching this category
    // are notified (see notification.service.ts).

    const row = await findRequestRow(created.id);
    if (!row) throw new RequestServiceError("Request could not be created.", "VALIDATION_ERROR");
    return mapToDetail(row);
  }

  async update(requestId: string, ownerId: string, input: UpdateRequestInput): Promise<RequestDetail> {
    const existing = await findRequestRow(requestId);
    if (!existing || existing.ownerId !== ownerId) {
      // Same message for "doesn't exist" and "not yours" — no need to
      // tell a stranger a private/other-owner's request exists.
      throw new RequestServiceError("Request not found.", "NOT_FOUND");
    }
    if (!EDITABLE_FROM.includes(existing.status)) {
      throw new RequestServiceError(
        "This request can no longer be edited because of its current status.",
        "INVALID_STATUS_TRANSITION"
      );
    }

    const budgetMin = input.budgetMin === null ? null : input.budgetMin;
    const budgetMax = input.budgetMax === null ? null : input.budgetMax;
    if (
      budgetMin != null &&
      budgetMax != null &&
      budgetMin > budgetMax
    ) {
      throw new RequestServiceError(
        "Minimum budget cannot be greater than maximum budget.",
        "VALIDATION_ERROR"
      );
    }

    await prisma.request.update({
      where: { id: requestId },
      data: {
        categoryId: input.categoryId,
        cityId: input.cityId,
        currencyId: input.currencyId,
        title: input.title?.trim(),
        description: input.description?.trim(),
        budgetMin,
        budgetMax,
      },
    });

    const row = await findRequestRow(requestId);
    if (!row) throw new RequestServiceError("Request not found.", "NOT_FOUND");
    return mapToDetail(row);
  }

  async remove(requestId: string, ownerId: string): Promise<void> {
    const existing = await prisma.request.findFirst({
      where: { id: requestId, deletedAt: null },
      select: { ownerId: true },
    });
    if (!existing || existing.ownerId !== ownerId) {
      throw new RequestServiceError("Request not found.", "NOT_FOUND");
    }

    // Soft delete — matches Request.deletedAt already in the schema.
    // getById/list/listMine all filter deletedAt: null, so this
    // disappears from every read path immediately while staying in the
    // database for audit/recovery.
    await prisma.request.update({
      where: { id: requestId },
      data: { deletedAt: new Date() },
    });
  }

  async publish(requestId: string, ownerId: string): Promise<RequestDetail> {
    const existing = await prisma.request.findFirst({
      where: { id: requestId, deletedAt: null },
      select: { ownerId: true, status: true },
    });
    if (!existing || existing.ownerId !== ownerId) {
      throw new RequestServiceError("Request not found.", "NOT_FOUND");
    }
    if (!PUBLISHABLE_FROM.includes(existing.status)) {
      throw new RequestServiceError(
        "Only a draft request can be published.",
        "INVALID_STATUS_TRANSITION"
      );
    }

    await prisma.request.update({
      where: { id: requestId },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });

    const row = await findRequestRow(requestId);
    if (!row) throw new RequestServiceError("Request not found.", "NOT_FOUND");
    return mapToDetail(row);
  }

  async close(requestId: string, ownerId: string): Promise<void> {
    const existing = await prisma.request.findFirst({
      where: { id: requestId, deletedAt: null },
      select: { ownerId: true, status: true },
    });
    if (!existing || existing.ownerId !== ownerId) {
      throw new RequestServiceError("Request not found.", "NOT_FOUND");
    }
    if (!CLOSABLE_FROM.includes(existing.status)) {
      throw new RequestServiceError(
        "Only a published or in-progress request can be closed.",
        "INVALID_STATUS_TRANSITION"
      );
    }

    await prisma.request.update({
      where: { id: requestId },
      data: { status: "CLOSED_BY_BUYER" },
    });
  }

  async getById(requestId: string): Promise<RequestDetail | null> {
    const row = await findRequestRow(requestId);
    if (!row) return null;
    return mapToDetail(row);
  }

  async list(filter: ListRequestsFilter): Promise<Paginated<RequestSummary>> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 12;

    const where = {
      deletedAt: null,
      countryId: filter.countryId,
      categoryId: filter.categoryId,
      cityId: filter.cityId,
      status: filter.status ?? "PUBLISHED",
      ...(filter.search
        ? {
            OR: [
              { title: { contains: filter.search, mode: "insensitive" as const } },
              { description: { contains: filter.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [rows, totalItems] = await Promise.all([
      prisma.request.findMany({
        where,
        include: requestInclude(),
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.request.count({ where }),
    ]);

    return {
      items: rows.map((r: NonNullable<RequestRow>) => mapToSummary(r)),
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    };
  }

  async listMine(ownerId: string, filter: ListMyRequestsFilter = {}): Promise<Paginated<RequestSummary>> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;

    // Deliberately NOT filtered to PUBLISHED-only, and not scoped to a
    // single country — "My Requests" is the owner's private view of
    // every request they've ever created, in any status.
    const where = {
      deletedAt: null,
      ownerId,
      ...(filter.status ? { status: filter.status } : {}),
    };

    const [rows, totalItems] = await Promise.all([
      prisma.request.findMany({
        where,
        include: requestInclude(),
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.request.count({ where }),
    ]);

    return {
      items: rows.map((r: NonNullable<RequestRow>) => mapToSummary(r)),
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    };
  }

  async syncOfferCount(requestId: string): Promise<void> {
    const count = await prisma.offer.count({ where: { requestId, deletedAt: null } });
    await prisma.request.update({ where: { id: requestId }, data: { offerCount: count } });
  }
}

export const requestService = new PrismaRequestService();
