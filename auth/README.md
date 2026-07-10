# Authentication Architecture

> **Status (Phase 3 — Part 1): code complete.** `auth.config.ts`, `auth.ts`,
> `password.ts`, `tokens.ts`, and `src/services/auth.service.ts` are
> implemented and unit-tested. Live-database verification (registration,
> login, email verification, password reset against a real Postgres
> instance) is written and ready in `tests/integration/auth-flow.e2e.test.ts`,
> pending `prisma generate`/`migrate` — see `DEPLOYMENT.md` for the exact
> remaining commands.

## Strategy

Matloob uses **credential-based auth (email or phone + password)** as
the primary path, with **OAuth (Google, Apple)** as a secondary path —
both converge on the same `User` table (see `prisma/schema.prisma`).

Recommended implementation: **NextAuth.js (Auth.js) v5** with a Prisma
adapter, customized as follows:

- `Credentials` provider backed by `passwordHash` on `User` (bcrypt/argon2).
- `Google` + `Apple` providers writing into `OAuthAccount`.
- JWT session strategy (not DB sessions) for scalability across
  serverless/edge functions — the `Session` table in the schema exists
  for *revocable* long-lived sessions (e.g. "log out of all devices"),
  not for every request.

## Why not roll a fully custom auth system?

Session handling, CSRF, password reset flows, and OAuth token refresh
are deceptively easy to get wrong and are exactly the kind of thing
that should not be reinvented for a marketplace platform handling
personal data and payments-adjacent flows. NextAuth.js is
battle-tested, actively maintained, and integrates cleanly with the
Prisma schema already in place.

## Files in this folder (Phase 2 deliverables)

```
src/auth/
  README.md              <- this file
  auth.config.ts         <- NextAuth config (providers, callbacks, JWT shape)
  auth.ts                <- exported `auth()`, `signIn()`, `signOut()` helpers
  guards.ts              <- requireAuth(), requireRole() helpers for
                             route handlers and server components
  password.ts            <- hashing/verification (argon2id)
  permissions.ts          <- role → permission matrix (see below)
```

## Roles & Permissions

Roles come from `UserRole` in the schema: `BUYER`, `SUPPLIER`, `BOTH`,
`ADMIN`, `MODERATOR`.

Permissions are **not** hardcoded as `if (role === 'ADMIN')` scattered
through the codebase. `permissions.ts` will define a single matrix:

```ts
export const PERMISSIONS = {
  BUYER: ["request:create", "request:close_own", "offer:accept_own"],
  SUPPLIER: ["offer:create", "offer:withdraw_own"],
  BOTH: ["request:create", "offer:create", "..."],
  MODERATOR: ["report:review", "request:remove", "user:suspend"],
  ADMIN: ["*"], // full access, including Admin Dashboard settings
} as const;
```

Route handlers and server components call `requireRole(session, "admin:settings:write")`
style guards rather than checking `role` directly — this keeps the
Admin Dashboard's permission model extensible (e.g. adding a
`FINANCE_ADMIN` role later touches one file, not every protected route).

## Admin Dashboard access

`ADMIN` and `MODERATOR` are still rows in the same `User` table — there
is no separate "admin database." Admin Dashboard routes
(`src/app/admin/**`) are protected by a layout-level guard
(`src/app/admin/layout.tsx`, Phase 2) that redirects anyone without an
admin-capable role.

## Security notes for Phase 2 implementation

- Passwords: argon2id, never bcrypt-only for new code.
- Rate limit `/api/auth/*` and `/api/requests` POST endpoints (see
  `docs/ARCHITECTURE.md` → Security section).
- All admin mutations must write an `AdminAuditLog` row (schema already
  includes this table) — no silent admin edits.
