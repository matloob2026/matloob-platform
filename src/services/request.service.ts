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
  /** Optional now — the create-request form no longer asks for a
   * country (see cityId below); when omitted, `create()` derives it
   * from the given city's own country. Still resolved and stored on
   * every request, since country-scoped browsing (`list()` below)
   * still depends on it — only the FORM stopped asking for it. */
  countryId?: string;
  /** The request's sole location signal now (Country/Currency removed
   * from the create-request form) — required in practice via the API
   * route's validation, kept optional here at the type level like
   * every other optional field for consistency with this interface's
   * existing style. */
  cityId?: string;
  currencyId?: string;
  title: string;
  description: string;
  budgetMin?: number;
  budgetMax?: number;
  mediaIds?: string[];
  /** Optional owner-supplied contact info, each with its own public-
   * visibility flag — replaces the removed Country/Currency fields on
   * the create-request form. */
  contactPhone?: string;
  contactPhoneVisible?: boolean;
  contactWhatsapp?: string;
  contactWhatsappVisible?: boolean;
  contactEmail?: string;
  contactEmailVisible?: boolean;
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
  /** The owner can always edit these later, per the polish pass's
   * requirement — same fields as CreateRequestInput. */
  contactPhone?: string | null;
  contactPhoneVisible?: boolean;
  contactWhatsapp?: string | null;
  contactWhatsappVisible?: boolean;
  contactEmail?: string | null;
  contactEmailVisible?: boolean;
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
   * Requests Admin Module: published requests for the public homepage
   * — NOT scoped to a single country (unlike `list()`, which is always
   * country-scoped for marketplace browsing), since a homepage
   * highlight is a platform-wide showcase. `isFeatured` is a PRIORITY
   * flag only, never a visibility filter: every published request is
   * eligible to appear here, featured ones simply sort first (then
   * newest-first within each group). A normal (non-featured) request
   * is never hidden just because nothing is currently featured.
   */
  getFeaturedForHomepage(limit?: number): Promise<RequestSummary[]>;

  /**
   * Requests polish pass: the public "عرض جميع الطلبات" listing page
   * (`/requests`) — paginated, platform-wide (not country-scoped,
   * same reasoning as `getFeaturedForHomepage`), featured requests
   * sorted first within each page just like the homepage section.
   */
  listAllPublished(page?: number, pageSize?: number): Promise<Paginated<RequestSummary>>;

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
    media: { orderBy: { sortOrder: "asc" } },
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
    media: row.media.map(
      (m: { id: string; url: string; altText: string | null; sortOrder: number }) => ({
        id: m.id,
        url: m.url,
        altText: m.altText ?? undefined,
        sortOrder: m.sortOrder,
      })
    ),
    expiresAt: row.expiresAt?.toISOString(),
    contact: {
      phone: row.contactPhone ?? undefined,
      phoneVisible: row.contactPhoneVisible,
      whatsapp: row.contactWhatsapp ?? undefined,
      whatsappVisible: row.contactWhatsappVisible,
      email: row.contactEmail ?? undefined,
      emailVisible: row.contactEmailVisible,
    },
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

    // The create-request form no longer asks for a country — resolve
    // it from the chosen city instead (a request's Country is still a
    // required column, used by country-scoped browsing elsewhere;
    // only the FORM stopped asking the user to pick one directly).
    let countryId = input.countryId;
    if (!countryId && input.cityId) {
      const city = await prisma.city.findUnique({ where: { id: input.cityId }, select: { countryId: true } });
      countryId = city?.countryId;
    }
    if (!countryId) {
      throw new RequestServiceError("City (or country) is required to create a request.", "VALIDATION_ERROR");
    }

    const publishImmediately = input.publishImmediately ?? true;
    const now = new Date();

    const created = await prisma.request.create({
      data: {
        ownerId: input.ownerId,
        categoryId: input.categoryId,
        countryId,
        cityId: input.cityId,
        currencyId: input.currencyId,
        title: input.title.trim(),
        description: input.description.trim(),
        budgetMin: input.budgetMin,
        budgetMax: input.budgetMax,
        contactPhone: input.contactPhone?.trim() || null,
        contactPhoneVisible: input.contactPhoneVisible ?? false,
        contactWhatsapp: input.contactWhatsapp?.trim() || null,
        contactWhatsappVisible: input.contactWhatsappVisible ?? false,
        contactEmail: input.contactEmail?.trim() || null,
        contactEmailVisible: input.contactEmailVisible ?? false,
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
        contactPhone: input.contactPhone === null ? null : input.contactPhone?.trim() || undefined,
        contactPhoneVisible: input.contactPhoneVisible,
        contactWhatsapp: input.contactWhatsapp === null ? null : input.contactWhatsapp?.trim() || undefined,
        contactWhatsappVisible: input.contactWhatsappVisible,
        contactEmail: input.contactEmail === null ? null : input.contactEmail?.trim() || undefined,
        contactEmailVisible: input.contactEmailVisible,
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

  async getFeaturedForHomepage(limit = 6): Promise<RequestSummary[]> {
    // Every published request must appear — Featured is a PRIORITY
    // flag, not a visibility filter. Ordering by (isFeatured desc,
    // publishedAt desc) in one query naturally puts featured requests
    // first (Postgres/Prisma sort `true` before `false` in a `desc`
    // boolean order) and orders newest-first within each group —
    // never restricts to featured-only, and never needs a separate
    // "no featured requests" fallback query, since normal published
    // requests are already included by default.
    const rows = await prisma.request.findMany({
      where: { deletedAt: null, status: "PUBLISHED" },
      include: requestInclude(),
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
      take: limit,
    });
    return rows.map((r: NonNullable<RequestRow>) => mapToSummary(r));
  }
  async listAllPublished(page = 1, pageSize = 12): Promise<Paginated<RequestSummary>> {
    const where = { deletedAt: null, status: "PUBLISHED" as const };
    const [rows, totalItems] = await Promise.all([
      prisma.request.findMany({
        where,
        include: requestInclude(),
        orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
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
}

export const requestService = new PrismaRequestService();
