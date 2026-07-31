import { requirePermission } from "@/auth/guards";
import { requestAdminService } from "@/services/admin/request-admin.service";
import { categoryAdminService } from "@/services/admin/category.service";
import { countryAdminService } from "@/services/admin/country.service";
import { cityAdminService } from "@/services/admin/city.service";
import { RequestsManager } from "./RequestsManager";

/**
 * Requests Administration Module — the operational heart of the
 * platform's Admin Dashboard. Real, database-backed, replacing the
 * mock `listRequestsMock`-driven page (see
 * src/services/admin/request-admin.service.ts for the full
 * architecture note).
 *
 * `requirePermission("requests:view")` gates the page itself (ADMIN +
 * MODERATOR, unchanged since Checkpoint 01); every mutation re-checks
 * its own specific permission independently in actions.ts.
 *
 * Categories/Countries/Cities are fetched here via the EXISTING admin
 * services (no duplicate "list categories" query) purely to populate
 * the filter dropdowns.
 */
export default async function AdminRequestsPage() {
  await requirePermission("requests:view");

  const [counts, initialList, categories, countries, cities] = await Promise.all([
    requestAdminService.getDashboardCounts(),
    requestAdminService.listRequests(),
    categoryAdminService.listCategories(),
    countryAdminService.listCountries(),
    cityAdminService.listCities(),
  ]);

  return (
    <RequestsManager
      counts={counts}
      initialResult={initialList}
      categories={categories}
      countries={countries}
      cities={cities}
    />
  );
}
