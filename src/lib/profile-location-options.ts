/**
 * Read-only country/city reference data for the Profile page's
 * location field. Deliberately separate from
 * src/lib/request-form-options.ts (which also loads categories and
 * currencies the profile page doesn't need) — same lightweight,
 * page-scoped loader pattern, not a shared service.
 */

import { prisma } from "@/lib/prisma";
import type { Locale } from "@/types/domain";

const DEFAULT_LOCALE: Locale = "ar";

function resolveName(translations: { locale: string; name: string }[]): string {
  return translations.find((t) => t.locale === DEFAULT_LOCALE)?.name ?? translations[0]?.name ?? "";
}

export interface LocationOption {
  id: string;
  name: string;
}

export interface CityLocationOption extends LocationOption {
  countryId: string;
}

export interface LocationOptions {
  countries: LocationOption[];
  cities: CityLocationOption[];
}

export async function getLocationOptions(): Promise<LocationOptions> {
  const [countries, cities] = await Promise.all([
    prisma.country.findMany({ where: { isActive: true }, include: { translations: true } }),
    prisma.city.findMany({
      where: { isActive: true },
      include: { translations: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return {
    countries: countries.map((c: { id: string; translations: { locale: string; name: string }[] }) => ({
      id: c.id,
      name: resolveName(c.translations),
    })),
    cities: cities.map(
      (c: { id: string; countryId: string; translations: { locale: string; name: string }[] }) => ({
        id: c.id,
        countryId: c.countryId,
        name: resolveName(c.translations),
      })
    ),
  };
}
