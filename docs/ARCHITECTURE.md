# Matloob — Architecture Overview

> Read this first. It links out to every other architectural decision
> document in `/docs` and explains how the pieces fit together.

## What Matloob is (and isn't)

Matloob is a **request-first marketplace**: buyers publish what they
need (a `Request`); suppliers respond with an `Offer`. This is the
inverse of a classic listings marketplace, and it shapes the
architecture in a few concrete ways:

- The `Request` entity — not a `Product`/`Listing` — is the core of the
  data model (see `docs/DATABASE.md`).
- There is no "search index products" feature to build. There IS a
  "match suppliers to requests" problem, which is why `src/ai/matching`
  is reserved architecture, not an afterthought.
- The hero's primary UI action is "create a request," never "search"
  — a decision made during the UI phase and preserved end-to-end into
  the API design (`POST /api/requests`, not `GET /api/search`).

## Tech stack

| Concern            | Choice                              | Why                                                                 |
|---------------------|--------------------------------------|----------------------------------------------------------------------|
| Framework           | Next.js (App Router), TypeScript     | SSR/SEO out of the box (SEO is an explicit requirement), file-based routing maps cleanly onto Pages/API separation |
| Database            | PostgreSQL                            | Relational integrity matters here (Requests ↔ Offers ↔ Conversations ↔ Users); JSON columns used sparingly where genuinely flexible data is needed (`PageContent.extra`, `Notification.metadata`) |
| ORM                 | Prisma                                | Type-safe queries generated from one schema file; migrations are reviewable diffs |
| Auth                | NextAuth.js (Auth.js) v5 + Prisma adapter | See `src/auth/README.md` |
| Styling             | Whatever the locked UI phase produced (Tailwind-compatible) — out of scope for this architecture pass | UI is frozen; this phase does not touch it |

## Folder structure

```
matloob-platform/
├── prisma/
│   ├── schema.prisma          <- single source of truth for the DB
│   └── migrations/            <- generated, reviewed, never hand-edited
├── src/
│   ├── app/                   <- Next.js App Router
│   │   ├── (marketing)/       <- public homepage, request browsing, request detail
│   │   ├── (auth)/            <- login, register
│   │   ├── admin/             <- Admin Dashboard pages (role-guarded)
│   │   └── api/                <- route handlers (thin — delegate to services)
│   ├── components/            <- presentational + composed UI components
│   │   ├── ui/                 <- primitives (Button, Input, Card...)
│   │   ├── hero/               <- hero-specific components
│   │   ├── requests/           <- request card, request grid, etc.
│   │   ├── categories/         <- category tile, category grid
│   │   ├── admin/              <- admin-only components (DataTable, MediaPicker...)
│   │   └── shared/              <- header, footer, nav
│   ├── layouts/                <- page-level layout wrappers
│   ├── services/                <- ALL business logic + DB access lives here
│   ├── lib/                      <- framework-agnostic utilities (prisma client, api-client, cache)
│   ├── hooks/                    <- React hooks (useRequests, useAuth, ...)
│   ├── types/                    <- hand-written domain + admin TypeScript contracts
│   ├── auth/                      <- NextAuth config, guards, permissions
│   ├── db/
│   │   └── seed/                  <- seed scripts (dev data, initial categories/countries)
│   ├── admin/                      <- admin architecture docs + shared admin logic
│   ├── ai/                          <- FUTURE AI module contracts (not implemented)
│   ├── config/                       <- localization resolver, site-wide non-DB config
│   ├── i18n/
│   │   └── locales/{ar,en}/           <- STATIC UI STRINGS ONLY (see docs/LOCALIZATION.md)
│   └── styles/
├── public/
│   └── uploads/                       <- local dev media (production uses S3/Cloudinary)
├── tests/
│   ├── unit/
│   └── integration/
├── scripts/                            <- one-off ops scripts (backfills, etc.)
└── docs/                                <- you are here
```

## The one rule that matters most: **services own logic, routes stay thin**

```
Component / Page
      │  calls
      ▼
src/hooks (client) or direct service call (server component)
      │
      ▼
src/services/*.service.ts   <-- ALL business rules, validation, transactions
      │
      ▼
src/lib/prisma.ts  →  PostgreSQL
```

API route handlers in `src/app/api/**/route.ts` should be near-trivial:
parse/validate input (zod), call exactly one service method, map the
result to a `NextResponse`. If a route handler has an `if` statement
implementing a business rule, that logic has leaked out of the service
layer and should move back.

This is what makes the codebase testable (services are plain
TypeScript classes/functions, testable without booting Next.js) and
what will let a future GraphQL layer, a mobile app's REST API, or a
background job all reuse the exact same business logic.

## Related documents

- `docs/DATABASE.md` — full entity reference and relationships
- `docs/ADMIN_DASHBOARD.md` — what's editable, how content flows to the homepage
- `docs/LOCALIZATION.md` — country/currency/city/language strategy
- `docs/AI_LAYER.md` — future AI module contracts
- `docs/SECURITY.md` — auth, rate limiting, data protection posture
- `src/auth/README.md`, `src/admin/README.md`, `src/ai/README.md` —
  in-context READMEs next to the code they describe

## What Phase 1 deliberately does NOT include

- No business logic implementations (every service method throws
  "Not yet implemented — Phase 1 is architecture only").
- No actual Next.js pages/components — the UI phase output is separate
  and will be wired into `src/app` and `src/components` in Phase 2.
- No AI provider integration.
- No CI/CD configuration yet (recommended next step, see bottom of
  `docs/DATABASE.md`... actually see the final summary in the handoff
  message — this file intentionally doesn't duplicate that).
