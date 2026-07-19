import { requirePermission } from "@/auth/guards";
import { staticPageAdminService } from "@/services/admin/static-page.service";
import { StaticPagesManager } from "./StaticPagesManager";

/**
 * Static Pages CMS management — Checkpoint 03's real, database-backed
 * content-management screen, reusing the existing `PageContent` model
 * (see src/services/admin/static-page.service.ts for how a static page
 * maps onto it). Replaces the Checkpoint 01 placeholder that lived at
 * this same route.
 *
 * `requirePermission` ensures only an authenticated ADMIN session
 * reaches this page (the "pages:view" permission is not granted to
 * MODERATOR — see src/auth/permissions.ts), on top of the session
 * check every admin route already gets from the protected layout.
 *
 * Data is fetched once here (server component) and handed to the
 * interactive client component below; mutations go through the server
 * actions in ./actions.ts, which re-validate the "pages:manage"
 * permission server-side before touching the database.
 */
export default async function AdminStaticPagesPage() {
  await requirePermission("pages:view");
  const pages = await staticPageAdminService.listPages();

  return <StaticPagesManager initialPages={pages} />;
}
