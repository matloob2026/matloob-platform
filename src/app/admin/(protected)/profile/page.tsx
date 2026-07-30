import { requireAdminSession } from "@/auth/guards";
import { ProfileManager } from "./ProfileManager";

/**
 * Admin Profile page — Administration module. Any authenticated
 * admin/moderator can view their own account info and change their
 * own password here (`requireAdminSession`, not `requirePermission` —
 * this is a personal account-settings page, not a managed resource).
 */
export default async function AdminProfilePage() {
  const session = await requireAdminSession();

  return <ProfileManager name={session.name} email={session.email} role={session.role} />;
}
