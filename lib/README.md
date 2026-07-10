# lib

Framework-agnostic, side-effect-light utilities:

- `prisma.ts` — the one Prisma client singleton (implemented)
- `api-client.ts` — uniform fetch wrapper (implemented)
- `cache.ts` (Phase 2) — homepage-config cache/revalidate helpers
- `validation/` (Phase 2) — shared zod schemas used by both API routes
  and forms (single source of truth for validation rules)
