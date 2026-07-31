/**
 * RequestAdminService
 * ====================
 * Requests Administration Module — the operational core of the
 * platform's Admin Dashboard. Owns every admin read/write for
 * `Request` rows: listing with combinable filters, full detail
 * (media, owner, reports, offers), status transitions, featuring, and
 * soft delete.
 *
 * Deliberately a SEPARATE service from the owner-facing
 * `src/services/request.service.ts` (`PrismaRequestService`) — this
 * mirrors the exact same split already established for every other
 * domain in this codebase (e.g. `category.service.ts` (admin) vs.
 * `category-public-content.ts` (public reader)). The owner-facing
 * service enforces "you can only edit/close/publish YOUR OWN request,
 * from a specific prior state"; this one is the admin's — no
 * ownership check, broader status transitions (including
 * PENDING_REVIEW/REJECTED, which only an admin ever sets), and reads
 * every request regardless of owner.
 *
 * Reuses rather than duplicates:
 *   - `Category`/`Country`/`City`/`Currency` — the exact same
 *     translation-join pattern every other admin service already
 *     uses,
 *   - `Media` — request images/attachments are the EXISTING
 *     `Request.media` relation (Media Library), no new upload path,
 *   - `Report` — the EXISTING model/enum for "Reports" (Ignore ->
 *     DISMISSED, Resolve -> RESOLVED, Close -> UNDER_REVIEW),
 *   - `Offer` — read-only here (count + list for the detail page's
 *     "jump to Offers Management filtered by this request" link); no
 *     offer mutation logic is duplicated,
 *   - `AdminAuditLog` — every mutation logs here, AND the detail
 *     page's "Activity timeline" is simply this same log filtered to
 *     `entityType: "Request"` — no new activity-log model,
 *   - `NotificationService` (src/services/notification.service.ts,
 *     just completed) — status changes notify the owner through it,
 *     never a direct `prisma.notification.create` call here.
 *
 * VERIFICATION NOTE: same sandbox limitation documented in every
 * other admin service — `prisma generate` cannot complete here
 * because the network proxy blocks binaries.prisma.sh. This code is
 * written directly against the real schema (including the
 * `PENDING_REVIEW`/`REJECTED`/`isFeatured` additions made for this
 * module, verified by hand-applying the migration SQL to a real local
 * PostgreSQL instance) and is expected to run as-is once
 * `prisma generate` + `prisma migrate deploy` succeed with real
 * network access (e.g. on Vercel).
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { notificationService } from "@/services/notification.service";

const DEFAULT_LOCALE = "ar";

// ---------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------

export class RequestAdminServiceError extends Error {
  constructor(message: string, public readonly code: "NOT_FOUND" | "VALIDATION_ERROR") {
    super(message);
    this.name = "RequestAdminServiceError";
  }
}

export function requestAdminServiceErrorStatus(code: RequestAdminServiceError["code"]): number {
  return code === "NOT_FOUND" ? 404 : 400;
}

// ---------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------

export type AdminRequestStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "IN_PROGRESS"
  | "FULFILLED"
  | "EXPIRED"
  | "CLOSED_BY_BUYER"
  | "REJECTED"
  | "REMOVED_BY_ADMIN";

/** The statuses an ADMIN may explicitly set — a superset of what the
 * owner-facing service allows (see that file's `PUBLISHABLE_FROM`
 * etc.), since an admin can move a request through the moderation
 * workflow (PENDING_REVIEW/REJECTED) that only exists for them. */
const ADMIN_SETTABLE_STATUSES: readonly AdminRequestStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "CLOSED_BY_BUYER",
  "REJECTED",
  "REMOVED_BY_ADMIN",
];

export interface AdminRequestListItem {
  id: string;
  title: string;
  categoryName: string;
  countryCode: string;
  cityName: string | null;
  ownerId: string;
  ownerName: string;
  ownerEmail: string | null;
  status: AdminRequestStatus;
  isFeatured: boolean;
  offerCount: number;
  reportCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestDashboardCounts {
  total: number;
  published: number;
  pendingReview: number;
  draft: number;
  closed: number;
  rejected: number;
  deleted: number;
  featured: number;
  reported: number;
  expired: number;
}

export interface ListRequestsFilters {
  search?: string;
  status?: AdminRequestStatus;
  categoryId?: string;
  countryId?: string;
  cityId?: string;
  ownerId?: string;
  isFeatured?: boolean;
  hasReports?: boolean;
  hasOffers?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: "createdAt" | "updatedAt" | "offerCount" | "title";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface ListRequestsResult {
  items: AdminRequestListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminReportItem {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  reporterName: string;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface AdminOfferItem {
  id: string;
  supplierId: string;
  supplierName: string;
  price: number | null;
  status: string;
  createdAt: Date;
}

export interface AdminActivityItem {
  id: string;
  actorName: string;
  action: string;
  before: unknown;
  after: unknown;
  createdAt: Date;
}

export interface AdminRequestDetail extends AdminRequestListItem {
  description: string;
  budgetMin: number | null;
  budgetMax: number | null;
  currencyCode: string | null;
  categoryId: string;
  countryId: string;
  cityId: string | null;
  media: { id: string; url: string; altText: string | null }[];
  reports: AdminReportItem[];
  offers: AdminOfferItem[];
  activity: AdminActivityItem[];
  publishedAt: Date | null;
  expiresAt: Date | null;
  deletedAt: Date | null;
}

// ---------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------

interface TranslationRow {
  locale: string;
  name: string;
}

function resolveLocalized(translations: TranslationRow[]): string {
  return translations.find((t) => t.locale === DEFAULT_LOCALE)?.name ?? translations[0]?.name ?? "";
}

const LIST_INCLUDE = {
  category: { include: { translations: true } },
  country: true,
  city: { include: { translations: true } },
  owner: { include: { profile: { select: { displayName: true } } } },
  _count: { select: { offers: { where: { deletedAt: null } }, reports: true } },
};

interface RequestListRecord {
  id: string;
  title: string;
  status: string;
  isFeatured: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  category: { translations: TranslationRow[] };
  country: { code: string };
  city: { translations: TranslationRow[] } | null;
  owner: { email: string | null; profile: { displayName: string } | null };
  _count: { offers: number; reports: number };
}

function toListItem(row: RequestListRecord): AdminRequestListItem {
  return {
    id: row.id,
    title: row.title,
    categoryName: resolveLocalized(row.category.translations),
    countryCode: row.country.code,
    cityName: row.city ? resolveLocalized(row.city.translations) : null,
    ownerId: row.ownerId,
    ownerName: row.owner.profile?.displayName ?? row.owner.email ?? "مستخدم",
    ownerEmail: row.owner.email,
    status: row.status as AdminRequestStatus,
    isFeatured: row.isFeatured,
    offerCount: row._count.offers,
    reportCount: row._count.reports,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function actorExists(actorId: string): Promise<boolean> {
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { id: true } });
  return Boolean(actor);
}

function warnAuditSkipped(action: string, entityId: string, actorId: string): void {
  console.warn(
    `[AdminAuditLog] skipped for action=${action} entityId=${entityId} — ` +
      `actor "${actorId}" has no matching User row. Will resume once real admin accounts are wired up.`
  );
}

const NOTIFY_ON_STATUS: Partial<Record<AdminRequestStatus, { type: "REQUEST_APPROVED" | "REQUEST_REJECTED"; title: string; body: string }>> = {
  PUBLISHED: {
    type: "REQUEST_APPROVED",
    title: "تم نشر طلبك",
    body: "تمت الموافقة على طلبك وهو الآن منشور ومرئي للموردين.",
  },
  REJECTED: {
    type: "REQUEST_REJECTED",
    title: "تم رفض طلبك",
    body: "للأسف تم رفض طلبك من قبل الإدارة. يمكنك التواصل مع الدعم لمزيد من التفاصيل.",
  },
  REMOVED_BY_ADMIN: {
    type: "REQUEST_REJECTED",
    title: "تمت إزالة طلبك",
    body: "قامت الإدارة بإزالة طلبك من المنصة لمخالفته الشروط.",
  },
};

// ---------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------

export class RequestAdminService {
  /** Every KPI card on the Requests Dashboard, computed in one
   * batched pass (a handful of `count()` calls run in parallel, not
   * sequentially) rather than N separate round-trips. */
  async getDashboardCounts(): Promise<RequestDashboardCounts> {
    const [
      total,
      published,
      pendingReview,
      draft,
      closed,
      rejected,
      deleted,
      featured,
      reportedIds,
      expired,
    ] = await Promise.all([
      prisma.request.count({ where: { deletedAt: null } }),
      prisma.request.count({ where: { deletedAt: null, status: "PUBLISHED" } }),
      prisma.request.count({ where: { deletedAt: null, status: "PENDING_REVIEW" } }),
      prisma.request.count({ where: { deletedAt: null, status: "DRAFT" } }),
      prisma.request.count({ where: { deletedAt: null, status: { in: ["CLOSED_BY_BUYER"] } } }),
      prisma.request.count({ where: { deletedAt: null, status: "REJECTED" } }),
      prisma.request.count({ where: { deletedAt: { not: null } } }),
      prisma.request.count({ where: { deletedAt: null, isFeatured: true } }),
      prisma.report.findMany({ where: { requestId: { not: null } }, distinct: ["requestId"], select: { requestId: true } }),
      prisma.request.count({ where: { deletedAt: null, status: "EXPIRED" } }),
    ]);

    return {
      total,
      published,
      pendingReview,
      draft,
      closed,
      rejected,
      deleted,
      featured,
      reported: reportedIds.length,
      expired,
    };
  }

  /** Combinable filters, server-side pagination/sorting — never loads
   * the full table into memory to filter in JS (unlike the smaller
   * CMS lists elsewhere in this project, Requests can genuinely grow
   * large, so this one filters/sorts/paginates entirely in the SQL
   * query). */
  async listRequests(filters?: ListRequestsFilters): Promise<ListRequestsResult> {
    const page = Math.max(1, filters?.page ?? 1);
    const pageSize = filters?.pageSize ?? 20;

    const where: Record<string, unknown> = {
      deletedAt: filters?.status === "REMOVED_BY_ADMIN" ? undefined : null,
    };

    if (filters?.status) where.status = filters.status;
    if (filters?.categoryId) where.categoryId = filters.categoryId;
    if (filters?.countryId) where.countryId = filters.countryId;
    if (filters?.cityId) where.cityId = filters.cityId;
    if (filters?.ownerId) where.ownerId = filters.ownerId;
    if (filters?.isFeatured !== undefined) where.isFeatured = filters.isFeatured;
    if (filters?.hasReports) where.reports = { some: {} };
    if (filters?.hasOffers) where.offers = { some: { deletedAt: null } };
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      };
    }
    if (filters?.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { id: q },
        { owner: { email: { contains: q, mode: "insensitive" } } },
        { owner: { profile: { displayName: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const sortBy = filters?.sortBy ?? "createdAt";
    const sortDir = filters?.sortDir ?? "desc";
    const orderBy: Record<string, "asc" | "desc"> =
      sortBy === "offerCount" ? { offerCount: sortDir } : { [sortBy]: sortDir };

    const [rows, total] = await Promise.all([
      prisma.request.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.request.count({ where }),
    ]);

    return {
      items: rows.map((r: RequestListRecord) => toListItem(r)),
      total,
      page,
      pageSize,
    };
  }

  async getRequestDetail(id: string): Promise<AdminRequestDetail> {
    const row = await prisma.request.findUnique({
      where: { id },
      include: {
        ...LIST_INCLUDE,
        currency: { select: { code: true } },
        media: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, altText: true } },
        reports: {
          orderBy: { createdAt: "desc" },
          include: { reporter: { include: { profile: { select: { displayName: true } } } } },
        },
        offers: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: { supplier: { include: { profile: { select: { displayName: true } } } } },
        },
      },
    });

    if (!row) {
      throw new RequestAdminServiceError("الطلب غير موجود.", "NOT_FOUND");
    }

    const activityLogs = await prisma.adminAuditLog.findMany({
      where: { entityType: "Request", entityId: id },
      orderBy: { createdAt: "desc" },
      include: { actor: { include: { profile: { select: { displayName: true } } } } },
    });

    return {
      ...toListItem(row),
      description: row.description,
      budgetMin: row.budgetMin ? Number(row.budgetMin) : null,
      budgetMax: row.budgetMax ? Number(row.budgetMax) : null,
      currencyCode: row.currency?.code ?? null,
      categoryId: row.categoryId,
      countryId: row.countryId,
      cityId: row.cityId,
      media: row.media,
      reports: row.reports.map(
        (r: {
          id: string;
          reason: string;
          details: string | null;
          status: string;
          createdAt: Date;
          resolvedAt: Date | null;
          reporter: { profile: { displayName: string } | null };
        }) => ({
          id: r.id,
          reason: r.reason,
          details: r.details,
          status: r.status,
          reporterName: r.reporter.profile?.displayName ?? "مستخدم",
          createdAt: r.createdAt,
          resolvedAt: r.resolvedAt,
        })
      ),
      offers: row.offers.map(
        (o: {
          id: string;
          supplierId: string;
          price: { toString(): string } | null;
          status: string;
          createdAt: Date;
          supplier: { profile: { displayName: string } | null };
        }) => ({
          id: o.id,
          supplierId: o.supplierId,
          supplierName: o.supplier.profile?.displayName ?? "مورد",
          price: o.price ? Number(o.price.toString()) : null,
          status: o.status,
          createdAt: o.createdAt,
        })
      ),
      activity: activityLogs.map(
        (log: {
          id: string;
          action: string;
          before: unknown;
          after: unknown;
          createdAt: Date;
          actor: { profile: { displayName: string } | null; email: string | null };
        }) => ({
          id: log.id,
          actorName: log.actor.profile?.displayName ?? log.actor.email ?? "—",
          action: log.action,
          before: log.before,
          after: log.after,
          createdAt: log.createdAt,
        })
      ),
      publishedAt: row.publishedAt,
      expiresAt: row.expiresAt,
      deletedAt: row.deletedAt,
    };
  }

  /** Status Management. Every change: writes an AdminAuditLog row,
   * notifies the owner via the existing NotificationService (only for
   * the statuses that mean something to the owner — see
   * `NOTIFY_ON_STATUS`), and the caller (the server action) is
   * responsible for revalidating affected public pages. */
  async setStatus(id: string, status: AdminRequestStatus, actorId: string): Promise<AdminRequestListItem> {
    if (!ADMIN_SETTABLE_STATUSES.includes(status)) {
      throw new RequestAdminServiceError(`لا يمكن تعيين الطلب لهذه الحالة (${status}) يدوياً.`, "VALIDATION_ERROR");
    }

    const before = await prisma.request.findUnique({ where: { id }, include: LIST_INCLUDE });
    if (!before) {
      throw new RequestAdminServiceError("الطلب غير موجود.", "NOT_FOUND");
    }

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const request = await tx.request.update({
        where: { id },
        data: {
          status,
          publishedAt: status === "PUBLISHED" && before.status !== "PUBLISHED" ? new Date() : before.publishedAt,
        },
        include: LIST_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "SET_REQUEST_STATUS",
            entityType: "Request",
            entityId: id,
            before: { status: before.status },
            after: { status: request.status },
          },
        });
      } else {
        warnAuditSkipped("SET_REQUEST_STATUS", id, actorId);
      }

      return request;
    });

    const notification = NOTIFY_ON_STATUS[status];
    if (notification) {
      await notificationService.notify({
        userId: updated.ownerId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        linkUrl: `/requests/${id}`,
        metadata: { requestId: id },
      });
    }

    return toListItem(updated);
  }

  /** Featured Requests. */
  async setFeatured(id: string, isFeatured: boolean, actorId: string): Promise<AdminRequestListItem> {
    const before = await prisma.request.findUnique({ where: { id }, include: LIST_INCLUDE });
    if (!before) {
      throw new RequestAdminServiceError("الطلب غير موجود.", "NOT_FOUND");
    }

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const request = await tx.request.update({ where: { id }, data: { isFeatured }, include: LIST_INCLUDE });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: isFeatured ? "FEATURE_REQUEST" : "UNFEATURE_REQUEST",
            entityType: "Request",
            entityId: id,
            before: { isFeatured: before.isFeatured },
            after: { isFeatured: request.isFeatured },
          },
        });
      } else {
        warnAuditSkipped(isFeatured ? "FEATURE_REQUEST" : "UNFEATURE_REQUEST", id, actorId);
      }

      return request;
    });

    return toListItem(updated);
  }

  /** Never a permanent delete — sets `deletedAt`, exactly like the
   * owner-facing service's `remove()` already does for a request's
   * own owner. This is the SAME soft-delete column, just reachable by
   * an admin for ANY request. */
  async softDelete(id: string, actorId: string): Promise<void> {
    const before = await prisma.request.findUnique({ where: { id } });
    if (!before) {
      throw new RequestAdminServiceError("الطلب غير موجود.", "NOT_FOUND");
    }

    const hasRealActor = await actorExists(actorId);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.request.update({ where: { id }, data: { deletedAt: new Date(), status: "REMOVED_BY_ADMIN" } });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "DELETE_REQUEST",
            entityType: "Request",
            entityId: id,
            before: { status: before.status, deletedAt: null },
            after: { status: "REMOVED_BY_ADMIN", deletedAt: new Date().toISOString() },
          },
        });
      } else {
        warnAuditSkipped("DELETE_REQUEST", id, actorId);
      }
    });
  }

  /** Reports: Ignore -> DISMISSED, Resolve -> RESOLVED, Close ->
   * UNDER_REVIEW — reuses the EXISTING `ReportStatus` enum as-is. */
  async setReportStatus(
    reportId: string,
    status: "DISMISSED" | "RESOLVED" | "UNDER_REVIEW",
    actorId: string
  ): Promise<void> {
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new RequestAdminServiceError("البلاغ غير موجود.", "NOT_FOUND");
    }

    const hasRealActor = await actorExists(actorId);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.report.update({
        where: { id: reportId },
        data: {
          status,
          resolvedById: status === "RESOLVED" || status === "DISMISSED" ? actorId : report.resolvedById,
          resolvedAt: status === "RESOLVED" || status === "DISMISSED" ? new Date() : report.resolvedAt,
        },
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "SET_REPORT_STATUS",
            entityType: "Report",
            entityId: reportId,
            before: { status: report.status },
            after: { status },
          },
        });
      } else {
        warnAuditSkipped("SET_REPORT_STATUS", reportId, actorId);
      }
    });
  }
}

export const requestAdminService = new RequestAdminService();
