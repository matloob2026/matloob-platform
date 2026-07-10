/**
 * LOCALIZATION ARCHITECTURE
 * =========================
 * This file defines HOW the platform resolves country/currency/city/
 * locale — it does NOT contain any actual country data. That data lives
 * in the database (Country, Currency, City, CountryCurrency tables) and
 * is managed from the Admin Dashboard.
 *
 * Adding Egypt, the UAE, or any future market is a matter of:
 *   1. Admin inserts a Country row (code "EG", isActive: true)
 *   2. Admin adds CountryTranslation rows (ar/en names)
 *   3. Admin links a Currency via CountryCurrency (EGP)
 *   4. Admin adds City rows for that country
 *
 * No code deploy required. This file only defines the *shape* of that
 * resolution and the fallback rules.
 *
 * DO NOT reintroduce hardcoded country logic anywhere else in the
 * codebase (no `if (country === 'SA')`). If a feature seems to need
 * that, it almost certainly needs a new SiteSetting or PageContent row
 * instead — ask before hardcoding.
 */

import type { Locale } from "@/types/domain";

export const SUPPORTED_LOCALES: Locale[] = ["ar", "en"];
export const DEFAULT_LOCALE: Locale = "ar";

/**
 * Resolution order for "what country is this visitor in":
 *   1. Explicit user preference (stored on UserProfile.countryId)
 *   2. `country` cookie (set once resolved, avoids re-resolving every request)
 *   3. Geo-IP lookup (edge middleware — provider TBD, see docs/LOCALIZATION.md)
 *   4. The Country row where isDefault = true
 *
 * This function is intentionally a *contract*, not an implementation —
 * the real DB-backed implementation lives in
 * src/services/localization.service.ts so this file has zero DB
 * dependency and can be safely imported into edge middleware.
 */
export interface CountryResolutionContext {
  userCountryId?: string;
  countryCookie?: string;
  geoIpCountryCode?: string;
}

export interface ResolvedLocalization {
  countryCode: string;
  locale: Locale;
  currencyCode: string;
}

/**
 * Pure resolution logic (no I/O). Given already-fetched candidate data,
 * decide the final country/locale/currency. The service layer is
 * responsible for fetching `activeCountryCodes` and the default country
 * from the database and calling this function — keeping this piece unit
 * testable without a database.
 */
export function resolveLocalization(
  ctx: CountryResolutionContext,
  activeCountryCodes: string[],
  defaultCountry: { code: string; defaultLocale: Locale; currencyCode: string }
): ResolvedLocalization {
  const candidate =
    ctx.userCountryId ?? ctx.countryCookie ?? ctx.geoIpCountryCode ?? undefined;

  const countryCode =
    candidate && activeCountryCodes.includes(candidate) ? candidate : defaultCountry.code;

  return {
    countryCode,
    locale: countryCode === defaultCountry.code ? defaultCountry.defaultLocale : DEFAULT_LOCALE,
    currencyCode: defaultCountry.currencyCode,
  };
}

/**
 * Formats a price using the resolved currency — the ONLY place currency
 * symbol placement/direction logic should live. Never format currency
 * ad-hoc in a component.
 */
export function formatCurrency(
  amount: number,
  currency: { code: string; symbol: string; decimalDigits: number },
  locale: Locale
): string {
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    minimumFractionDigits: currency.decimalDigits,
    maximumFractionDigits: currency.decimalDigits,
  }).format(amount);

  return locale === "ar" ? `${formatted} ${currency.symbol}` : `${currency.symbol} ${formatted}`;
}
