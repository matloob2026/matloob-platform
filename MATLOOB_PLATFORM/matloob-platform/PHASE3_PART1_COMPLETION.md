# Phase 3 — Part 1 completion report (Auth foundation)

**Status: code-complete, approved pending live Prisma migration and
end-to-end verification** (see DEPLOYMENT.md for the exact remaining
commands).

## Delivered
- `prisma/schema.prisma`: `EmailVerificationToken`, `PasswordResetToken` models
- `src/auth/password.ts` — argon2id hashing/verification
- `src/auth/tokens.ts` — SHA-256 one-time tokens for verification/reset links
- `src/lib/mailer/` — `Mailer` interface + `ConsoleMailer`, with a documented production swap point
- `src/services/auth.service.ts` — register, verify-email, login, forgot/reset password
- `src/auth/auth.config.ts` + `src/auth/auth.ts` — NextAuth v5, JWT sessions, Credentials provider
- API routes: `/api/auth/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/api/auth/[...nextauth]`
- `tests/unit/auth/*` — 9 unit tests for password hashing + token generation (passing)
- `tests/integration/auth-flow.e2e.test.ts` — 13 end-to-end tests covering all 4 flows, auto-skips without `DATABASE_URL`, ready to run for real

## Verified in-sandbox
- `tsc --noEmit`: clean
- `eslint`: clean
- All runnable unit tests: passing
- `next build`'s compile + type-check phases: clean (page-data collection phase fails only on the un-generated Prisma engine, the expected sandbox limitation)

## Pending (blocked only by sandbox network access to `binaries.prisma.sh`)
- `prisma generate` / `prisma migrate dev`
- Running `tests/integration/auth-flow.e2e.test.ts` for real against a live database

No Phase 2 (admin dashboard) or homepage files were modified.
