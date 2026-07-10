# Admin Dashboard Architecture

> For the full table → screen mapping and folder layout, see
> `src/admin/README.md`. This document covers dashboard-wide concerns:
> data flow, caching, and the content pipeline from Admin edit to
> homepage render.

## The content pipeline

```
Admin edits "Hero Headline"
        │
        ▼
Admin Dashboard form (src/app/admin/content/hero/page.tsx)
        │  calls
        ▼
Admin service (src/services/admin/page-content.service.ts, Phase 2)
        │  1. validates input (zod)
        │  2. writes PageContent row
        │  3. writes AdminAuditLog row  ── same DB transaction
        │  4. invalidates homepage cache
        ▼
Public homepage (src/app/(marketing)/page.tsx)
        │  calls
        ▼
HomepageContentService.getHomepageConfig(locale)
        │  (src/services/homepage-content.service.ts)
        ▼
Rendered <Hero /> component — new headline live immediately
```

No component ever reads `PageContent`, `SiteSetting`, `HomepageStat`,
etc. directly. `HomepageContentService` is the only consumer-facing
read path (see that file's docstring for the full rationale) — this is
what guarantees a dashboard edit actually appears on the site without
a matching frontend code change.

## Caching strategy (Phase 2 decision point)

Homepage content is read on every visitor's page load but written
rarely (an admin editing copy). Recommended approach:

- Cache `getHomepageConfig(locale)` result with Next.js's `unstable_cache`
  (or a Redis-backed cache if traffic warrants it), tagged by locale.
- Admin service calls `revalidateTag('homepage-config')` after every
  write — instant invalidation, no stale-content window beyond the
  save button click.

Do not skip caching "for now and add it later" — homepage read volume
will dwarf every other query on the platform, and retrofitting cache
invalidation into a dozen call sites later is far more error-prone
than building it in from the first implementation.

## Access control

Admin routes live under `src/app/admin/**` and are protected by a
single `layout.tsx` guard (Phase 2) checking `role` is `ADMIN` or
`MODERATOR` via `src/auth/guards.ts`. Fine-grained permission checks
(e.g. `MODERATOR` can review reports but not edit branding) use the
permission matrix in `src/auth/README.md`, not scattered role checks.

## Audit log is not optional

Every admin service method that mutates a table listed in
`src/admin/README.md`'s table must write an `AdminAuditLog` row in the
same transaction. This is a hard requirement, not a nice-to-have,
because these tables directly control what every site visitor sees —
an unaudited change to, say, the contact email or a category's active
flag is a support/trust incident waiting to happen.

## Media Library

`Media` is one table used across the whole platform (request photos,
avatars, category icons, hero images, the logo itself). The Admin
Dashboard's Media Library screen (`src/app/admin/media/page.tsx`,
Phase 2) is a browser/uploader over this single table — there is
deliberately no separate "homepage images" table, so an image uploaded
once can be reused as, say, both a category image and a hero card
without re-uploading.
