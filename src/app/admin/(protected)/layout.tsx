import { requireAdminSession } from "@/auth/guards";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { MobileNavProvider } from "@/components/admin/MobileNavContext";
import { prisma } from "@/lib/prisma";

/**
 * Wraps every route under src/app/admin/** (except /admin/login).
 * `requireAdminSession()` redirects to /admin/login if there's no
 * session — see src/auth/guards.ts. Swapping the mock session for real
 * NextAuth later only touches that one file, not this layout.
 *
 * Administration module: also resolves the session's assigned custom
 * `AdminRole` permissions (if any) ONCE here, server-side, so
 * `AdminSidebar`'s nav-visibility filtering can include them alongside
 * the hardcoded baseline — see AdminSidebar.tsx's `extraPermissions`
 * prop and src/auth/guards.ts's `requirePermission` for the matching
 * server-side enforcement.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();

  const extraPermissions = session.customRoleId
    ? (
        await prisma.adminRolePermission.findMany({
          where: { roleId: session.customRoleId },
          select: { permission: true },
        })
      ).map((p: { permission: string }) => p.permission)
    : [];

  return (
    <MobileNavProvider>
      <div className="min-h-screen bg-surface-muted">
        <AdminSidebar role={session.role} extraPermissions={extraPermissions} />
        <div className="lg:mr-64">
          <AdminTopbar session={session} />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </MobileNavProvider>
  );
}
