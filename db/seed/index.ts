/**
 * Database seed script — `npm run db:seed`.
 *
 * Phase 2 TODO: populate, in order (respecting foreign keys):
 *   1. Country (Saudi Arabia: code "SA", isActive: true, isDefault: true, defaultLocale: "ar")
 *   2. Currency (SAR: symbol "ر.س", decimalDigits: 2) + CountryCurrency link
 *   3. City rows for major Saudi cities + CityTranslation (ar/en)
 *   4. Category rows matching the 8 categories already established in
 *      the UI phase (Real Estate, Cars, Jobs, Electronics, Services,
 *      Furniture, Pets, Travel) + CategoryTranslation
 *   5. PageContent rows for hero/how_it_works/cta/footer_statement using
 *      the exact final copy locked in the UI design phase, so the
 *      database-driven homepage matches the static one being replaced
 *   6. HomepageStat rows (+25,000 requests published, etc.)
 *   7. TrustBadge rows ("دفع وتواصل آمن", "دعم فني 24/7")
 *   8. SiteSetting rows: branding.logo_url, contact.support_email, etc.
 *   9. One ADMIN user (credentials from env, never hardcoded in this file)
 *
 * This file intentionally throws until Phase 2 implementation begins —
 * a seed script that silently does nothing is worse than one that fails
 * loudly.
 */

async function main(): Promise<void> {
  throw new Error(
    "Seed script not yet implemented — Phase 1 is architecture only. See TODO list in this file's docstring for the Phase 2 plan."
  );
}

main();
