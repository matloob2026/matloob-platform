# Admin Dashboard Architecture

## Purpose

The Admin Dashboard is what makes the promise from the design phase
real: **nothing marketing-facing is hardcoded.** Every table listed
below has a corresponding Admin Dashboard screen planned for Phase 2+.

| Dashboard screen         | Database table(s)                        | Controls                                                              |
|---------------------------|-------------------------------------------|------------------------------------------------------------------------|
| Branding                  | `SiteSetting` (group: branding)           | Logo, favicon, primary/secondary color                                 |
| Homepage → Hero            | `PageContent` (section: hero)              | Headline, subtext, CTA label/url, hero images (via `Media`)            |
| Homepage → How It Works    | `PageContent` (section: how_it_works)      | Title, step list (`extra` JSON), background tone                       |
| Homepage → CTA             | `PageContent` (section: cta)                | Heading, body, button label/url                                        |
| Homepage → Stats           | `HomepageStat`, `HomepageStatTranslation` | Add/remove/reorder stat counters, icon, localized label                |
| Categories                 | `Category`, `CategoryTranslation`          | Add/remove/reorder categories, icon, cover image, sub-categories       |
| Cities & Countries         | `Country`, `CountryTranslation`, `City`, `CityTranslation`, `CountryCurrency` | Launch a new country, manage its cities, set its currency |
| Footer                     | `PageContent` (section: footer_statement), `SocialLink`, `TrustBadge` | Footer statement text, social links, trust badges |
| Contact Info               | `SiteSetting` (group: contact)             | Support email/phone/WhatsApp                                           |
| SEO                        | `SeoSetting`                                | Per-page meta title/description/OG image, global defaults              |
| Media Library              | `Media`                                     | Central upload/browse for every image used anywhere on the site        |
| Users & Roles              | `User`, `UserProfile`                       | Suspend/ban, verify suppliers, change roles                            |
| Requests moderation        | `Request`, `Report`                         | Review reported requests, remove listings                              |
| Audit Log                  | `AdminAuditLog`                             | Read-only trail of every admin mutation                                |

## Architectural rule: Admin writes are never direct Prisma calls from a route handler

Every admin mutation goes through a dedicated **admin service**
(`src/services/admin/*.service.ts`, Phase 2) that:

1. Validates the input.
2. Performs the write.
3. Writes an `AdminAuditLog` row in the same transaction (`before`/`after`
   snapshots as JSON).
4. Invalidates any cache that depends on that data (e.g. homepage config
   cache — see `src/services/homepage-content.service.ts`).

This is non-negotiable for anything touching `PageContent`,
`SiteSetting`, `HomepageStat`, `TrustBadge`, `SocialLink`, `SeoSetting`,
`Category`, `Country`, `City` — i.e. anything a site visitor sees
immediately reflected on the public site.

## Folder layout (Phase 2+)

```
src/app/admin/
  layout.tsx                <- role guard (ADMIN | MODERATOR only)
  dashboard/page.tsx        <- overview / metrics
  content/
    hero/page.tsx           <- edit PageContent(section: hero)
    how-it-works/page.tsx
    cta/page.tsx
    footer/page.tsx
    stats/page.tsx
    trust-badges/page.tsx
  localization/
    countries/page.tsx      <- Country + CountryTranslation + CountryCurrency
    cities/page.tsx
    currencies/page.tsx
  categories/page.tsx
  media/page.tsx             <- Media Library browser/uploader
  settings/
    branding/page.tsx
    contact/page.tsx
    seo/page.tsx
  users/page.tsx
  requests/page.tsx          <- moderation queue
  reports/page.tsx
  audit-log/page.tsx

src/components/admin/
  DataTable.tsx               <- shared sortable/paginated table
  RichTextEditor.tsx          <- for PageContent.body
  MediaPicker.tsx             <- picks/uploads from Media Library
  TranslationTabs.tsx         <- ar/en tab switcher for any *Translation model
  AuditTrailViewer.tsx
```

## Why a generic `TranslationTabs` component matters

Every translatable entity (`Country`, `City`, `Category`,
`HomepageStat`, `TrustBadge`, `PageContent`) follows the exact same
shape: one row per `(parentId, locale)`. Building ONE reusable
translation-tab editor component that any admin form can compose,
rather than a bespoke ar/en form per entity, is what keeps this
dashboard maintainable as more languages are added later (the schema
already supports N locales, not just 2).
