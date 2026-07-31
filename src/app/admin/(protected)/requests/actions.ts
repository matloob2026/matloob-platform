"use server";

/**
 * Server actions backing the Requests Admin Module
 * (src/app/admin/(protected)/requests/page.tsx + RequestsManager.tsx +
 * [id]/page.tsx). Same thin-wrapper shape as every other CMS
 * actions.ts in this codebase: authorize, call the admin service, map
 * the result to a small serializable state object, revalidate the
 * affected public routes.
 *
 * Reads require `requests:view` (ADMIN + MODERATOR, unchanged since
 * Checkpoint 01). Status changes require `requests:publish`, feature
 * toggling requires `requests:feature`, soft delete requires
 * `requests:delete`, and report handling requires `requests:edit` —
 * each independently re-checked here (ADMIN gets all four via the
 * wildcard; a MODERATOR only gets whichever a custom Role grants —
 * see src/services/admin/admin-role.service.ts).
 */

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/auth/guards";
import {
  REQUEST_EDIT_PERMISSION,
  REQUEST_DELETE_PERMISSION,
  REQUEST_PUBLISH_PERMISSION,
  REQUEST_FEATURE_PERMISSION,
} from "@/auth/permissions";
import {
  requestAdminService,
  RequestAdminServiceError,
  type AdminRequestStatus,
  type ListRequestsFilters,
} from "@/services/admin/request-admin.service";

export interface RequestActionState {
  success: boolean;
  error?: string;
}

function toActionState(err: unknown): RequestActionState {
  if (err instanceof RequestAdminServiceError) {
    return { success: false, error: err.message };
  }
  console.error("[admin/requests] unexpected error", err);
  return { success: false, error: "حدث خطأ غير متوقع. حاول مرة أخرى." };
}

/** A request can be featured on the homepage/other public surfaces —
 * revalidate both the Admin screen and the homepage, plus the
 * request's own public detail page, so a status/feature change shows
 * up immediately everywhere. */
function revalidateRequestRoutes(requestId?: string): void {
  revalidatePath("/admin/requests");
  revalidatePath("/");
  if (requestId) revalidatePath(`/requests/${requestId}`);
}

export async function getDashboardCountsAction() {
  await requirePermission("requests:view");
  return requestAdminService.getDashboardCounts();
}

export async function listRequestsAction(filters?: ListRequestsFilters) {
  await requirePermission("requests:view");
  return requestAdminService.listRequests(filters);
}

export async function getRequestDetailAction(id: string) {
  await requirePermission("requests:view");
  return requestAdminService.getRequestDetail(id);
}

export async function setRequestStatusAction(id: string, status: AdminRequestStatus): Promise<RequestActionState> {
  const session = await requirePermission(REQUEST_PUBLISH_PERMISSION);
  try {
    await requestAdminService.setStatus(id, status, session.userId);
    revalidateRequestRoutes(id);
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function setRequestFeaturedAction(id: string, isFeatured: boolean): Promise<RequestActionState> {
  const session = await requirePermission(REQUEST_FEATURE_PERMISSION);
  try {
    await requestAdminService.setFeatured(id, isFeatured, session.userId);
    revalidateRequestRoutes(id);
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function softDeleteRequestAction(id: string): Promise<RequestActionState> {
  const session = await requirePermission(REQUEST_DELETE_PERMISSION);
  try {
    await requestAdminService.softDelete(id, session.userId);
    revalidateRequestRoutes(id);
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function setReportStatusAction(
  reportId: string,
  status: "DISMISSED" | "RESOLVED" | "UNDER_REVIEW"
): Promise<RequestActionState> {
  const session = await requirePermission(REQUEST_EDIT_PERMISSION);
  try {
    await requestAdminService.setReportStatus(reportId, status, session.userId);
    revalidatePath("/admin/requests");
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}
