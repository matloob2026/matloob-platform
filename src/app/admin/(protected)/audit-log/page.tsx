import { requirePermission } from "@/auth/guards";
import { AUDIT_LOG_VIEW_PERMISSION } from "@/auth/permissions";
import { auditLogAdminService } from "@/services/admin/audit-log.service";
import { AuditLogViewer } from "./AuditLogViewer";

/**
 * Audit Log viewer — Administration module. Read-only surface for the
 * EXISTING `AdminAuditLog` rows every admin service already writes
 * (see src/services/admin/audit-log.service.ts).
 */
export default async function AdminAuditLogPage() {
  await requirePermission(AUDIT_LOG_VIEW_PERMISSION);
  const [initialResult, entityTypes] = await Promise.all([
    auditLogAdminService.listLogs(),
    auditLogAdminService.listEntityTypes(),
  ]);

  return <AuditLogViewer initialResult={initialResult} entityTypes={entityTypes} />;
}
