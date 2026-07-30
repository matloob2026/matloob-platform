"use server";

/**
 * Server action backing the Audit Log viewer
 * (src/app/admin/(protected)/audit-log/page.tsx + AuditLogViewer.tsx).
 * Read-only — requires `AUDIT_LOG_VIEW_PERMISSION` (ADMIN only).
 */

import { requirePermission } from "@/auth/guards";
import { AUDIT_LOG_VIEW_PERMISSION } from "@/auth/permissions";
import { auditLogAdminService, type AuditLogFilters } from "@/services/admin/audit-log.service";

export async function listAuditLogsAction(filters?: AuditLogFilters) {
  await requirePermission(AUDIT_LOG_VIEW_PERMISSION);
  return auditLogAdminService.listLogs(filters);
}
