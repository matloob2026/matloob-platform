# Security Posture

This document tracks the security decisions baked into the
architecture and the ones still owed in Phase 2 implementation. Treat
every unchecked item as a blocker for production launch, not a
"nice to have later."

## Authentication & sessions
- [x] Architecture: NextAuth.js v5, JWT session strategy, Prisma adapter (`src/auth/README.md`)
- [ ] Passwords hashed with argon2id (dependency already in `package.json`)
- [ ] Revocable sessions (`Session` table) used for explicit "log out of
      all devices" flows
- [ ] Rate limiting on `/api/auth/*` (login, register, password reset)
- [ ] Account lockout / exponential backoff after repeated failed logins

## Authorization
- [x] Architecture: role matrix in `src/auth/README.md`, never scattered
      `if (role === ...)` checks
- [ ] Every admin-mutating route protected by `requireRole()` guard
- [ ] Every admin-mutating service call writes `AdminAuditLog` in the
      same transaction (see `docs/ADMIN_DASHBOARD.md`) — non-negotiable

## Data protection
- [x] Architecture: soft deletes (`deletedAt`) preserve data for disputes
      without exposing it in normal queries (services must filter
      `deletedAt: null` by default)
- [ ] PII minimization review before launch: confirm `UserProfile`,
      `Request` fields exposed via public API don't leak more than
      necessary (e.g. exact phone numbers should stay inside
      `Conversation`/`Message`, not on public `RequestDetail`)
- [ ] Encrypt sensitive fields at rest if/when payment data is introduced
      (out of scope for current schema — no payment tables exist yet)

## Input validation
- [ ] Every API route validates input with `zod` before touching a
      service (services should also defensively validate, but the route
      is the first line of defense against malformed/oversized payloads)
- [ ] File upload validation (`Media` creation): mime-type allowlist,
      size limits, virus/malware scanning hook before persisting to
      permanent storage

## Rate limiting & abuse prevention
- [ ] `POST /api/requests` and `POST /api/offers` rate-limited per user
      (prevents spam publishing)
- [ ] `Report` submissions rate-limited to prevent report-flooding abuse
- [ ] Consider CAPTCHA or equivalent on public registration

## Admin Dashboard specific
- [ ] Admin routes are never reachable without an authenticated
      `ADMIN`/`MODERATOR` session — enforced at the layout level
      (`src/app/admin/layout.tsx`), not per-page
- [ ] Media Library uploads scoped/validated the same as public uploads
      — an admin account being compromised shouldn't allow arbitrary
      file uploads either

## Infrastructure
- [ ] All secrets via environment variables (`.env.example` documents
      every required key) — never committed
- [ ] `DATABASE_URL` uses a least-privilege DB user in production, not a
      superuser
- [ ] HTTPS enforced end-to-end; `NEXTAUTH_URL` and cookies configured
      `Secure`/`HttpOnly`/`SameSite=Lax` at minimum

## Dependency hygiene
- [ ] `npm audit` / Dependabot (or equivalent) wired into CI once CI
      exists (see `docs/ARCHITECTURE.md` "Phase 1 deliberately does not
      include" section — no CI config yet)

## What's already structurally prevented by this architecture

- Cross-country data leakage: `RequestService.list()`'s filter type
  requires `countryId` — there is no code path that queries requests
  without a country scope.
- Silent content changes: the entire Admin Dashboard content pipeline
  (`docs/ADMIN_DASHBOARD.md`) routes through audited service methods,
  never direct Prisma calls from a page component.
- Vendor lock-in risk on AI: the `AiProvider` interface
  (`src/ai/shared/types.ts`) means a provider security incident (e.g. a
  vendor data-handling issue) requires swapping one implementation, not
  rewriting every call site.
