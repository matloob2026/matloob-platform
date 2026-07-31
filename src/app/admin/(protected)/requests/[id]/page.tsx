import { notFound } from "next/navigation";
import { requirePermission } from "@/auth/guards";
import { requestAdminService, RequestAdminServiceError } from "@/services/admin/request-admin.service";
import { RequestDetailView } from "./RequestDetailView";

/**
 * Request Detail — Requests Administration Module. Full information,
 * status management, featuring, reports, offers summary, and activity
 * timeline (the existing AdminAuditLog, filtered to this request — no
 * new activity-log model). See
 * src/services/admin/request-admin.service.ts's `getRequestDetail`.
 */
export default async function AdminRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("requests:view");
  const { id } = await params;

  try {
    const detail = await requestAdminService.getRequestDetail(id);
    return <RequestDetailView detail={detail} />;
  } catch (err) {
    if (err instanceof RequestAdminServiceError && err.code === "NOT_FOUND") {
      notFound();
    }
    throw err;
  }
}
