import { requirePermission } from "@/auth/guards";
import { adminUserAdminService } from "@/services/admin/admin-user.service";
import { adminRoleAdminService } from "@/services/admin/admin-role.service";
import { UsersManager } from "./UsersManager";

/**
 * Admin Users management — real, database-backed screen. Replaces the
 * mock `listUsersMock`-driven page (see
 * src/services/admin/admin-user.service.ts for the full architecture
 * note). This is the SAME screen used to promote a user to
 * MODERATOR/ADMIN, lock/unlock any account, trigger a password reset,
 * and assign a custom Role (see src/services/admin/admin-role.service.ts)
 * to a MODERATOR — not a second, parallel "admin accounts" screen.
 *
 * `requirePermission` ensures only an authenticated session with
 * `users:view` reaches this page (ADMIN and MODERATOR — unchanged
 * since Checkpoint 01); write actions re-check `users:manage`
 * (ADMIN only) independently in actions.ts.
 */
export default async function AdminUsersPage() {
  const session = await requirePermission("users:view");
  const [users, roles] = await Promise.all([adminUserAdminService.listUsers(), adminRoleAdminService.listRoles()]);

  return <UsersManager initialUsers={users} availableRoles={roles} currentUserId={session.userId} />;
}
