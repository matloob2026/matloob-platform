# Deployment checklist — Phase 3 (Auth foundation + Request Management)

Everything in Phase 3 — Part 1 (auth) and Part 2 (request management)
is code-complete. The database migration (`prisma/migrations/20260101000000_init_auth_and_requests/migration.sql`)
was hand-authored directly from `prisma/schema.prisma` — the sandbox
this project was developed in cannot reach `binaries.prisma.sh` (the
Prisma engine download host), so `prisma migrate dev` could never run
there to generate it automatically. To compensate, the hand-written SQL
was verified for real: a local PostgreSQL 16 server was installed in
the sandbox and the migration was applied to it directly with `psql`
(not through Prisma, since the engine still isn't available). That
confirmed, against a real database:
- All 34 tables (every model in `schema.prisma`, plus the 2 implicit
  many-to-many join tables) are created with zero errors, and the
  migration re-applies cleanly to a fresh empty database.
- Every column name, type, nullability, and default matches
  `schema.prisma` exactly (spot-checked table-by-table against `\d`).
- Unique constraints reject duplicates correctly (e.g. `users.email`).
- Foreign key behavior is correct: `CASCADE` deletes clean up dependent
  rows (profile/sessions/tokens when a user is deleted), and
  `RESTRICT` correctly blocks deleting a category or user that still
  has requests pointing at it.
- The exact flows this project's code performs — register (user +
  profile + verification token in one transaction), verify (status
  flip to ACTIVE), session tracking, and request creation with its
  category/country foreign keys — were run as raw SQL against this
  schema and completed correctly.

What's still pending is only running the **Prisma CLI itself**
(`prisma generate`, `prisma migrate deploy`) somewhere with normal
network access — neither Vercel nor a normal local machine has this
sandbox's restriction, and once that runs, this already-verified SQL
is what it will apply.

## Vercel Environment Variables — exactly what's required

Set these three in the Vercel project's Settings → Environment Variables
(Production, and Preview if you test there too). Without all three,
registration/login cannot work — this was the cause of the
`MissingSecret` error:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | **Yes** | Real Postgres connection string reachable from Vercel (Vercel Postgres, Neon, Supabase, etc.) |
| `NEXTAUTH_URL` | **Yes** | Must be your actual deployment URL, e.g. `https://your-project.vercel.app` — not `localhost` |
| `NEXTAUTH_SECRET` | **Yes** | Random secret, e.g. `openssl rand -base64 32`. `src/auth/auth.config.ts` also accepts `AUTH_SECRET` (NextAuth v5's own auto-detected name) if you'd rather use that instead — either satisfies it, but at least one must be set |

Everything else in `.env.example` (`GOOGLE_CLIENT_ID`, `S3_*`,
`EMAIL_PROVIDER_API_KEY`, `SENTRY_DSN`, etc.) is **not required** for
registration/login/request management to work — those are for features
not yet wired in (OAuth providers, media upload, a real transactional
email provider, observability). Verification/reset emails currently go
through `ConsoleMailer` (see `src/lib/mailer/`), which just logs the
message — on Vercel that means the raw verification/reset link shows
up in your Vercel Function logs, not in an actual inbox, until a real
mail provider is wired in as the documented next swap-in step.

### The `MissingSecret` error specifically
Root cause: `src/auth/auth.config.ts`'s `NextAuthConfig` object never
set a `secret` field. NextAuth v5 auto-detects an `AUTH_SECRET` env var
by convention — it does **not** automatically read `NEXTAUTH_SECRET`
unless the config explicitly says so. This project's own convention
(matching `NEXTAUTH_URL`, already used in `auth.service.ts`) is the
`NEXTAUTH_SECRET` name, so it was never being picked up. Fixed by
explicitly setting `secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET`
in `auth.config.ts` — set `NEXTAUTH_SECRET` (or `AUTH_SECRET`) in Vercel
and redeploy.

## Remaining commands (run in order, once deployed / on a machine with normal network access)

The migration itself already exists and is verified — see the note
above. Nothing needs to be generated; it only needs to be *applied*
and confirmed against Vercel's real Postgres.

```bash
# 1. Install deps — this also runs `prisma generate` automatically
#    via the postinstall hook already wired into package.json.
npm install

# 2. Apply the already-written, already-verified migration to your
#    real database. DATABASE_URL should be the same value you set on
#    Vercel (or point at it directly if running this from your own
#    machine/CI). This is non-interactive and safe to (re-)run —
#    Prisma tracks what's already applied in its own
#    `_prisma_migrations` table.
npx prisma migrate deploy

# 3. Run the full end-to-end test suite — auth (register, login,
#    verify-email, reset-password) AND request management (create,
#    edit, delete, ownership enforcement, publish/close status
#    transitions, My Requests). Both files under tests/integration/
#    auto-skip when DATABASE_URL isn't set, and run for real once it is.
npm run test:integration
```

That's the entire remaining list. `vercel.json`'s `buildCommand` already
runs `prisma migrate deploy && next build`, so a normal Vercel deploy
(with `DATABASE_URL` set) applies this migration automatically — step 2
above is only needed if you want to confirm it manually ahead of time,
or seed data before your first real deploy. Nothing else in Phase 3 is
pending.

## Already wired up for you (no action needed)
- `package.json`: `postinstall` runs `prisma generate` automatically.
- `package.json`: `db:migrate:deploy` → `prisma migrate deploy` for CI/production.
- `.env.example`: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` already documented, with the Vercel-specific notes above.
- `vercel.json`: `buildCommand` runs `prisma migrate deploy && next build`, so the already-written migration applies automatically on every deploy — no manual step required.
- `src/auth/auth.config.ts`: `secret` now explicitly wired to `AUTH_SECRET`/`NEXTAUTH_SECRET` — fixes the `MissingSecret` error.

## Seeding reference data (categories/countries/cities/currencies)
Part 2's Create/Edit Request forms read categories, countries, cities,
and currencies straight from the database (`src/lib/request-form-options.ts`).
If your database is freshly migrated and empty, those dropdowns will
be empty too until at least one active row exists in each of
`categories`, `countries`, and (optionally) `cities`/`currencies` —
seed a handful of rows for your target market before testing the
Create Request form end to end.

## If step 2 or 3 fails
- **Step 2 fails to connect**: double check `DATABASE_URL` is reachable from wherever you're running the command (Vercel Postgres/Neon/Supabase all work; make sure IP allowlisting, if any, includes your build environment).
- **Step 3 fails**: it means the live flows found a real bug, not a sandbox limitation — the failing test name will point at exactly which flow (an auth flow, or a request flow: create/edit/delete/ownership/status) broke and why.
