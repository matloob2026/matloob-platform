/**
 * AuditLogAdminService
 * =====================
 * Administration module: Audit Log viewer. Purely read-only — every
 * admin service in this codebase already writes to the EXISTING
 * `AdminAuditLog` model on every create/update/delete/status-change
 * (see the `actorExists`/`warnAuditSkipped` pattern each one follows);
 * this service just surfaces those rows, resolving the actor's
 * display name/email so the viewer doesn't show raw user ids.
 *
 * No new model, no duplicate logging mechanism — this is the first
 * screen that actually reads what was already being written all
 * along.
 */

import { prisma } from "@/lib/prisma";

export interface AuditLogListItem {
  id: string;
  actorName: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  createdAt: Date;
}

interface AuditLogRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  createdAt: Date;
  actor: { email: string | null; profile: { displayName: string } | null };
}

const AUDIT_LOG_INCLUDE = {
  actor: { include: { profile: { select: { displayName: true } } } },
};

function toListItem(log: AuditLogRecord): AuditLogListItem {
  return {
    id: log.id,
    actorName: log.actor.profile?.displayName ?? log.actor.email ?? "—",
    actorEmail: log.actor.email,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    before: log.before,
    after: log.after,
    createdAt: log.createdAt,
  };
}

export interface AuditLogFilters {
  search?: string;
  entityType?: string;
  page?: number;
}

export interface AuditLogListResult {
  items: AuditLogListItem[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 25;

export class AuditLogAdminService {
  async listLogs(filters?: AuditLogFilters): Promise<AuditLogListResult> {
    const page = Math.max(1, filters?.page ?? 1);

    const where: Record<string, unknown> = {};
    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }
    if (filters?.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { action: { contains: q, mode: "insensitive" } },
        { entityId: { contains: q, mode: "insensitive" } },
        { actor: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        include: AUDIT_LOG_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    return {
      items: rows.map((r: AuditLogRecord) => toListItem(r)),
      total,
      page,
      pageSize: PAGE_SIZE,
    };
  }

  /** Every distinct `entityType` value seen so far — populates the
   * viewer's filter dropdown without hand-maintaining a fixed list
   * that would drift from whatever admin services actually log. */
  async listEntityTypes(): Promise<string[]> {
    const rows = await prisma.adminAuditLog.findMany({
      distinct: ["entityType"],
      select: { entityType: true },
      orderBy: { entityType: "asc" },
    });
    return rows.map((r: { entityType: string }) => r.entityType);
  }
}

export const auditLogAdminService = new AuditLogAdminService();
