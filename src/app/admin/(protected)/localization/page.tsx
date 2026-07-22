import { requirePermission } from "@/auth/guards";
import { PageHeader } from "@/components/admin/PageHeader";
import { Tabs } from "@/components/admin/Tabs";
import { countryAdminService } from "@/services/admin/country.service";
import { cityAdminService } from "@/services/admin/city.service";
import { CountriesManager } from "./CountriesManager";
import { CitiesManager } from "./CitiesManager";

/**
 * Countries/Cities CMS management — real, database-backed, completing
 * the mock-driven screen from Checkpoint 01 (see
 * src/services/mock/localization.mock.ts, now removed). Reuses the
 * existing Country/City/CountryTranslation/CityTranslation models
 * (see src/services/admin/country.service.ts /
 * src/services/admin/city.service.ts) — no new model.
 *
 * `requirePermission` ensures only an authenticated ADMIN session
 * reaches this page (the "localization:view" permission is not
 * granted to MODERATOR — see src/auth/permissions.ts). Both tabs'
 * data is fetched once here (server component) and handed to their
 * interactive client components; mutations go through the server
 * actions in ./actions.ts, which re-validate "localization:manage"
 * server-side before touching the database.
 *
 * Cities are fetched unfiltered here (the client-side country
 * dropdown then filters in-memory — small dataset, consistent with
 * how Categories/Static Pages already do client-side search).
 */
export default async function AdminLocalizationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePermission("localization:view");
  const [{ tab }, countries, cities] = await Promise.all([
    searchParams,
    countryAdminService.listCountries(),
    cityAdminService.listCities(),
  ]);

  return (
    <div>
      <PageHeader
        title="المدن والدول"
        description="إدارة الأسواق المدعومة على المنصة — إضافة دولة جديدة (مثل مصر) لا يحتاج أي تعديل برمجي"
      />
      <Tabs
        defaultKey={tab}
        items={[
          { key: "countries", label: "الدول", content: <CountriesManager initialCountries={countries} /> },
          {
            key: "cities",
            label: "المدن",
            content: <CitiesManager initialCities={cities} countries={countries} />,
          },
        ]}
      />
    </div>
  );
}
