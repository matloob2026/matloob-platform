# Localization Architecture

## The rule

**No country, currency, city, or market-specific value is ever
hardcoded in application code.** Saudi Arabia is the launch market and
Egypt is next, but neither name should appear in a `.ts`/`.tsx` file
anywhere in this codebase. If you're about to write
`if (country === "SA")`, stop — that almost always means either:

- a new `Country`/`City`/`Currency` row is needed (data, not code), or
- a new `SiteSetting` / `PageContent` row is needed (admin-configurable
  content, not code).

## Three distinct layers of "localization," kept separate on purpose

### 1. Static UI strings — `src/i18n/locales/{ar,en}/common.json`

Button labels, nav items, form placeholders, validation/error messages.
These are genuinely static per-language and rarely change, so a
translation-file approach (versus a database) is correct here — no
admin needs to edit "Log In" vs "Log Out" copy.

### 2. Marketing content — `PageContent`, `HomepageStat`, `TrustBadge`, etc. (database)

Hero headline, footer statement, CTA copy, stat counters. This is
NOT in the i18n JSON files, even though it's also just "text," because
it needs to be admin-editable without a code deploy (that's the whole
point of the Admin Dashboard phase). See `docs/ADMIN_DASHBOARD.md`.

### 3. Market data — `Country`, `Currency`, `City` (database)

Not text at all — structural data that determines which cities appear
in a dropdown, what currency symbol is used, and what the default
locale is for a given country. Fully described in `docs/DATABASE.md`.

## How a request gets scoped to a country

Every `Request` row has a required `countryId`. There is no
"international" request feed — a buyer in Saudi Arabia sees Saudi
requests/suppliers, a buyer in Egypt (once launched) sees Egyptian
ones. This is enforced at the service layer
(`ListRequestsFilter.countryId` is a required field in
`src/services/request.service.ts`, not optional) so it's structurally
impossible to accidentally build a cross-country query.

## Resolving which country/locale a visitor is in

See `src/config/localization.ts` for the pure resolution function and
its docstring for the fallback order (explicit user preference → cookie
→ Geo-IP → platform default). The actual Geo-IP provider and the
DB-backed wrapper (`src/services/localization.service.ts`) are a Phase
2 implementation task.

## Launching Egypt: the actual checklist (zero code changes expected)

1. Admin Dashboard → Localization → Countries → add `EG`, set
   `defaultLocale: "ar"`, leave `isActive: false` until ready.
2. Add `CountryTranslation` rows (ar: "مصر", en: "Egypt").
3. Add `Currency` row for `EGP` if not already present, link via
   `CountryCurrency`.
4. Add `City` rows for Cairo, Alexandria, Giza, etc. + their
   `CityTranslation`s.
5. Flip `Country.isActive` to `true` for Egypt.
6. (Optional) Add Egypt-specific `PageContent`/`SeoSetting` overrides if
   marketing copy should differ by country — the schema supports this
   via `entityType`/`entityId` scoping on `SeoSetting`; `PageContent`
   would need a similar optional `countryId` scoping column if
   country-specific homepage copy (not just language-specific) becomes
   a real requirement — flagged here as a possible schema extension,
   not yet added, since it's speculative until product requirements
   confirm it's needed.

Nowhere in that list is "open a `.tsx` file."
