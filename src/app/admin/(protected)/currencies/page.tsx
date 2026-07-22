import { requirePermission } from "@/auth/guards";
import { currencyAdminService } from "@/services/admin/currency.service";
import { CurrenciesManager } from "./CurrenciesManager";

/**
 * Currencies CMS management — real, database-backed, completing the
 * Checkpoint 01 placeholder. Reuses the existing Currency model (see
 * src/services/admin/currency.service.ts) — no new model, and no
 * `isActive` toggle since the schema has no such column (see that
 * service's docstring).
 *
 * `requirePermission` ensures only an authenticated ADMIN session
 * reaches this page ("currencies:view" is not granted to MODERATOR —
 * see src/auth/permissions.ts). Mutations go through the server
 * actions in ./actions.ts, which re-validate "currencies:manage"
 * server-side before touching the database.
 */
export default async function AdminCurrenciesPage() {
  await requirePermission("currencies:view");
  const currencies = await currencyAdminService.listCurrencies();

  return <CurrenciesManager initialCurrencies={currencies} />;
}
