# Database Architecture

Full schema: `prisma/schema.prisma`. This document explains the *why*
behind the schema — read it alongside the schema file, not instead of it.

## Entity map

### Identity & Access
| Table | Purpose |
|---|---|
| `User` | Core account: email/phone, password hash, role, status. Deliberately minimal — display info lives in `UserProfile`. |
| `UserProfile` | Display name, avatar, bio, company name, supplier verification, rating. Split from `User` so auth concerns and public profile concerns evolve independently. |
| `OAuthAccount` | Google/Apple sign-in, linked to `User`. |
| `Session` | Revocable long-lived sessions ("log out of all devices"). Not used for every request — see `src/auth/README.md`. |

### Localization Foundation
| Table | Purpose |
|---|---|
| `Country` | One row per market. `isActive` toggles visibility; `isDefault` is the fallback. Adding Egypt = inserting a row, not a deploy. |
| `CountryTranslation` | Localized country name per locale. |
| `Currency` | ISO 4217 currency definitions (SAR, EGP, ...). |
| `CountryCurrency` | Join table — a country's default (and potentially future secondary) currency. |
| `City` | Scoped to a country via `countryId`; `slug` unique per country, not globally. |
| `CityTranslation` | Localized city name per locale. |

**Why translations are side-tables and not `nameAr`/`nameEn` columns:**
adding a third language later (e.g. French for a future market) would
require a migration and a code change everywhere a name is read if
columns were used. With the side-table pattern, adding a language is
inserting rows the UI already knows how to query for
(`translations.find(t => t.locale === currentLocale)`).

### Catalog
| Table | Purpose |
|---|---|
| `Category` | Self-referencing (`parentId`) so sub-categories are possible without a schema change. Icon/image via `Media`. |
| `CategoryTranslation` | Localized name/description. |

### The Core Loop: Requests & Offers
| Table | Purpose |
|---|---|
| `Request` | A buyer's published need. Status machine: `DRAFT → PUBLISHED → IN_PROGRESS → FULFILLED` (or `EXPIRED` / `CLOSED_BY_BUYER` / `REMOVED_BY_ADMIN`). Scoped to `countryId` (and optionally `cityId`) — there is no cross-country request feed. |
| `Offer` | A supplier's response. One active offer per `(requestId, supplierId)` pair (`@@unique`). Status machine: `PENDING → ACCEPTED / REJECTED / WITHDRAWN / EXPIRED`. |
| `Conversation` | Created when an offer is accepted (or optionally earlier, for pre-offer questions — decide in Phase 2). Anchored to a `Request`, optionally to one `Offer`. |
| `ConversationParticipant` | Join table; supports future group/support conversations, not just 1:1. |
| `Message` | Belongs to a `Conversation`; supports attachments via `Media`. |

**Why `offerCount` is denormalized on `Request`:** the homepage and
request-list views need to show offer counts on potentially hundreds
of cards per page. Counting `Offer` rows per request on every list
query doesn't scale. The counter is written by `RequestService.syncOfferCount()`
— the *only* writer — called by `OfferService` whenever an offer's
lifecycle changes. See `src/services/request.service.ts`.

**Why AI columns already exist on `Request`:** `aiSuggestedCategoryId`
and `aiQualityScore` are nullable, unused-by-business-logic-today
columns. Adding them now means the future AI layer (`src/ai/categorization`)
doesn't need a migration to start writing suggestions — it just starts
populating already-existing nullable columns.

### Trust & Safety
| Table | Purpose |
|---|---|
| `Favorite` | Buyer bookmarks a request (used for suppliers watching categories, or buyers tracking their own posts). |
| `Report` | Flags a `User` and/or `Request`; moderation queue status machine (`OPEN → UNDER_REVIEW → RESOLVED/DISMISSED`). |
| `AdminAuditLog` | Every admin mutation writes here with before/after JSON snapshots. Required for any table an admin can edit. |

### Media
| Table | Purpose |
|---|---|
| `Media` | Single table for every uploaded asset platform-wide — request photos, avatars, category icons, homepage hero images, admin-uploaded logo. `ownerType` enum disambiguates usage; actual ownership is via the relation fields (`Request.media`, `Category.icon`, etc.), not a generic polymorphic FK, to keep referential integrity enforced by the database. |

### Admin-Editable Site Content
| Table | Purpose |
|---|---|
| `SiteSetting` | Flat key/value settings grouped by `group` (branding, contact, footer, feature_flags, localization_defaults). |
| `PageContent` | Structured, translatable content blocks per `(page, section, locale)` — hero, how-it-works, CTA, footer statement. |
| `HomepageStat` + `HomepageStatTranslation` | The "+25,000 requests published" style counters — addable/removable/reorderable from Admin. |
| `TrustBadge` + `TrustBadgeTranslation` | Footer trust badges. |
| `SocialLink` | Footer social icons. |
| `SeoSetting` | Per-entity (or global) meta title/description/OG image/canonical/noindex. |

See `docs/ADMIN_DASHBOARD.md` for how these map to actual dashboard screens.

### Notifications
| Table | Purpose |
|---|---|
| `Notification` | Multi-channel (`NotificationChannel`), typed (`NotificationType` includes `AI_SUGGESTION` for the future AI layer), with a flexible `metadata` JSON payload. |

## Design conventions applied throughout

1. **UUID primary keys** everywhere — no sequential IDs leaking business
   volume (competitors shouldn't be able to estimate total request count
   from `/requests/1047`).
2. **Soft deletes** (`deletedAt`) on user-generated content (`User`,
   `Request`, `Offer`, `Message`) — never hard-delete data that might be
   needed for disputes, audits, or "undo."
3. **Timestamps** (`createdAt`/`updatedAt`) on every table.
4. **Indexes** added on every foreign key used in a `WHERE` or `ORDER BY`
   in the services layer's anticipated query patterns (status+category
   lookups on `Request`, `userId` lookups on `Session`/`Notification`, etc.)
5. **`@@map` snake_case table names** — Prisma models stay idiomatic
   PascalCase in TypeScript while the actual PostgreSQL tables follow
   conventional snake_case, which plays nicer with raw SQL, BI tools,
   and DBAs who expect it.

## Next steps for implementation (Phase 2)

1. `prisma migrate dev --name init` against a real Postgres instance
   (this sandbox couldn't reach `binaries.prisma.sh` to run `prisma
   validate`/`generate` — run this from your actual dev machine or CI
   first, and fix any surface-level syntax issues Prisma flags).
2. Write `src/db/seed/index.ts`: seed `Country` (Saudi Arabia active +
   default), `Currency` (SAR), a starter `City` list, and the 8
   `Category` rows already established in the UI phase (Real Estate,
   Cars, Jobs, Electronics, Services, Furniture, Pets, Travel).
3. Seed `PageContent` rows for `hero`/`how_it_works`/`cta`/`footer_statement`
   using the exact copy already locked in the UI phase, so the "dynamic"
   homepage renders identically to the static one on day one.
