# Matloob

**A request-first marketplace.** Buyers publish what they need; suppliers
respond with offers. Not a listings/search marketplace — the platform's
entire architecture, from the database schema to the hero section's
primary CTA, is built around that distinction.

## Project status: Phase 1 — Architecture Complete

The UI design phase is finished and locked (see the design handoff for
the actual homepage). This repository currently contains **architecture
only**: folder structure, database schema, service-layer contracts,
type definitions, and documentation. No business logic is implemented
yet — every service method intentionally throws
`"Not yet implemented — Phase 1 is architecture only."` This is by
design, not an oversight: see `docs/ARCHITECTURE.md`.

## Start here

1. **`docs/ARCHITECTURE.md`** — overall structure, tech stack, the
   "services own logic, routes stay thin" rule
2. **`docs/DATABASE.md`** — every table and why it's shaped the way it is
3. **`docs/ADMIN_DASHBOARD.md`** — how admin edits flow to the live site
4. **`docs/LOCALIZATION.md`** — how new countries get added with zero code changes
5. **`docs/AI_LAYER.md`** — reserved architecture for future AI features
6. **`docs/SECURITY.md`** — security checklist, what's structural vs. still owed

Plus in-context READMEs next to the code they describe:
`src/auth/README.md`, `src/admin/README.md`, `src/ai/README.md`,
`src/components/README.md`, `src/layouts/README.md`,
`src/hooks/README.md`, `src/lib/README.md`.

## Quick facts

- **Framework:** Next.js (App Router) + TypeScript
- **Database:** PostgreSQL via Prisma (`prisma/schema.prisma`)
- **Auth:** NextAuth.js v5, credentials + Google/Apple OAuth
- **Core entities:** `Request` and `Offer` (not `Product`/`Listing`)
- **Nothing hardcoded:** country, currency, city, homepage copy, logo,
  footer, SEO tags, trust badges, and stats are all database-driven and
  Admin-Dashboard-editable

## Getting started (once Phase 2 implementation begins)

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL at minimum
npm run db:migrate           # applies prisma/schema.prisma
npm run db:seed              # seeds Saudi Arabia + categories + homepage copy
npm run dev
```

> Note: `prisma validate`/`generate` could not be executed in the
> sandbox this architecture was built in (no network access to
> `binaries.prisma.sh`). Run `npx prisma validate` as your first step
> in a real environment to confirm the schema compiles cleanly, before
> writing any Phase 2 code against it.

## Folder structure (summary — full detail in `docs/ARCHITECTURE.md`)

```
src/
├── app/            Next.js pages, layouts, API routes
├── components/     UI components (ui, hero, requests, categories, admin, shared)
├── layouts/         Page-level layout wrappers
├── services/        ALL business logic + DB access
├── lib/              Framework-agnostic utilities
├── hooks/            Client-side data hooks
├── types/            Hand-written domain + admin TypeScript contracts
├── auth/             NextAuth config, guards, permissions
├── db/seed/           Seed scripts
├── admin/             Admin architecture docs + shared admin logic
├── ai/                 Future AI module contracts (not implemented)
├── config/             Localization resolver, site config
├── i18n/locales/        Static UI strings (ar/en)
└── styles/
```

## Recommended next step

See the final architecture handoff summary for the full Phase 2
roadmap. In short: run the Prisma migration against a real database,
implement the seed script, then build the `RequestService`/`OfferService`
Prisma implementations and the corresponding API routes — the core
publish-a-request → receive-offers loop — before touching Admin
Dashboard screens or the AI layer.
