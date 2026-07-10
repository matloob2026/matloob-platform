# Layouts

Page-level layout wrappers composed in `src/app/**/layout.tsx` files:

- `MarketingLayout` — header + footer chrome for public pages
- `AuthLayout` — centered card layout for login/register
- `AdminLayout` — sidebar nav + role guard for /admin/**

Layouts handle chrome and structure only. Auth/role guards used inside
`AdminLayout` come from `src/auth/guards.ts` (Phase 2).
