/**
 * Read-only reference data for the Create/Edit Request forms
 * (category, country, city, currency dropdown options).
 *
 * This intentionally is NOT a new service class — it's a thin,
 * page-scoped data loader. RequestService remains the only service
 * introduced/extended in Phase 3 — Part 2; a full LocalizationService
 * (already sketched as a TODO in homepage-content.service.ts) is out
 * of scope here and can absorb this later without callers changing,
 * since both pages only import the named functions below.
 */

import { prisma } from "@/lib/prisma";
import type { Locale } from "@/types/domain";

const DEFAULT_LOCALE: Locale = "ar";

function resolveName(translations: { locale: string; name: string }[]): string {
  return (
    translations.find((t) => t.locale === DEFAULT_LOCALE)?.name ?? translations[0]?.name ?? ""
  );
}

export interface RequestFormOption {
  id: string;
  name: string;
}

/** Categories module completion: parent/child grouping and icon
 * preview in the Create Request form (see RequestForm.tsx) — reuses
 * the exact same active-categories read below, just returns two more
 * already-available fields. */
export interface CategoryOption extends RequestFormOption {
  parentId: string | null;
  iconUrl: string | null;
}

export interface CityOption extends RequestFormOption {
  countryId: string;
}

export interface CurrencyOption {
  id: string;
  code: string;
  symbol: string;
}

export interface RequestFormOptions {
  categories: CategoryOption[];
  countries: RequestFormOption[];
  cities: CityOption[];
  currencies: CurrencyOption[];
}

export async function getRequestFormOptions(): Promise<RequestFormOptions> {
  const [categories, countries, cities, currencies] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      include: { translations: true, icon: { select: { url: true } } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.country.findMany({
      where: { isActive: true },
      include: { translations: true },
    }),
    prisma.city.findMany({
      where: { isActive: true },
      include: { translations: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.currency.findMany(),
  ]);

  return {
    categories: categories.map(
      (c: {
        id: string;
        parentId: string | null;
        translations: { locale: string; name: string }[];
        icon: { url: string } | null;
      }) => ({
        id: c.id,
        name: resolveName(c.translations),
        parentId: c.parentId,
        iconUrl: c.icon?.url ?? null,
      })
    ),
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
    currencies: currencies.map((c: { id: string; code: string; symbol: string }) => ({
      id: c.id,
      code: c.code,
      symbol: c.symbol,
    })),
  };
}
