import { requirePermission } from "@/auth/guards";
import { ROLE_MANAGE_PERMISSION } from "@/auth/permissions";
import { adminRoleAdminService } from "@/services/admin/admin-role.service";
import { RolesManager } from "./RolesManager";

/**
 * Roles management — Administration module. See
 * src/services/admin/admin-role.service.ts for the full architecture
 * note (an additive layer, ADMIN-only, never delegable — see
 * `ROLE_MANAGE_PERMISSION`'s own docstring).
 */
export default async function AdminRolesPage() {
  await requirePermission(ROLE_MANAGE_PERMISSION);
  const roles = await adminRoleAdminService.listRoles();

  return <RolesManager initialRoles={roles} />;
}
