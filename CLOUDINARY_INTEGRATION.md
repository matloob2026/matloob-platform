# Cloudinary Integration — summary

## What was implemented

**Schema (minimal, additive — see instructions' "unless absolutely
necessary" carve-out):**
- `media.sortOrder` (Int, default 0) — persisted display order for a
  request's image gallery. Necessary because Prisma's implicit
  many-to-many join table for `Request ↔ Media` can't hold extra
  columns.
- `media.cloudinaryPublicId` (Text, nullable) — needed to actually
  delete the remote Cloudinary asset, not just the DB row.
- New migration: `prisma/migrations/20260201000000_add_media_cloudinary_fields/migration.sql`
  (the existing `20260101000000_init_auth_and_requests` migration was
  **not** edited — this is a proper additive follow-up migration).
  Verified against a real local PostgreSQL instance, applied on top of
  the existing migration with zero errors.

**Cloudinary client (`src/lib/cloudinary.ts`):** signed, server-side
upload/destroy using Cloudinary's REST API directly via `fetch` + a
computed SHA-1 signature (same "small dependency-free provider
integration" pattern as `ResendMailer` — no new npm dependency).
Nothing is ever uploaded unsigned or client-direct — every upload goes
through our own authenticated API routes first.

**MediaService (`src/services/media.service.ts`):** all validation and
ownership logic in one place:
- Max file size: 5MB.
- Allowed types: JPEG, PNG, WEBP, GIF.
- Max 8 images per request.
- Ownership enforced identically to `RequestService`/`AuthService`'s
  existing pattern (same `NOT_FOUND` for "doesn't exist" and "not
  yours" — no existence leak).
- Replacing an avatar deletes the previous one's Cloudinary asset
  (never leaves orphaned images).

**API routes (all new, none existing modified):**
- `POST /api/media/requests/[requestId]` — upload one image
- `PATCH /api/media/requests/[requestId]/reorder` — persist new order
- `DELETE /api/media/[id]` — delete a request image or avatar
- `POST /api/media/avatar`, `DELETE /api/media/avatar` — avatar upload/replace/remove

**UI (existing design language, no redesign):**
- `RequestImageManager` — upload, preview, reorder (◀/▶), delete —
  wired into the Request Details page's existing owner-only section
- A read-only, lazy-loaded gallery for non-owner viewers on the same page
- `AvatarUploader` — upload/replace/delete
- New `/profile` page (didn't exist before) hosting the avatar manager —
  a new page, not a modification of any existing one
- All images render via `next/image` (automatic optimization,
  responsive `sizes`, lazy loading by default) rather than plain
  `<img>` — this is what actually delivers "automatic compression /
  responsive delivery / lazy loading," more so than hand-built
  Cloudinary transformation URLs would have. `next.config.mjs` was
  given one added `remotePatterns` entry for `res.cloudinary.com` (same
  list that already had Unsplash/Pexels) — required for `next/image` to
  optimize Cloudinary URLs at all.

**One necessary fix along the way:** `src/lib/api-client.ts`'s shared
`apiFetch` helper unconditionally set `Content-Type: application/json`,
which would have broken every file upload (the browser must set its
own multipart boundary). Fixed to skip that header when the body is
`FormData` — existing JSON callers are unaffected.

**Tests:** new unit tests for the URL helper, plus a new
`tests/integration/media-flow.e2e.test.ts` covering ownership
enforcement and validation (the parts that don't require live
Cloudinary credentials to verify) — same skip-without-`DATABASE_URL`
pattern as the existing auth/request suites.

## Verified in this sandbox
- `tsc --noEmit`, `eslint .`: clean (one pre-existing, unrelated warning)
- All runnable tests passing
- `next build`: compiles and type-checks cleanly across every route, including all new media routes/pages/components
- The new migration: applied for real against a local PostgreSQL 16 instance, on top of the existing one, with zero errors
- `prisma generate`/`migrate deploy`: still blocked only by this sandbox's lack of network access to `binaries.prisma.sh` — unrelated to this feature, unchanged from every previous phase, will run normally on Vercel

## Required Cloudinary environment variables (add in Vercel)

| Variable | Where to get it |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard home page |
| `CLOUDINARY_API_KEY` | Cloudinary dashboard → Settings → API Keys |
| `CLOUDINARY_API_SECRET` | Same page — keep this secret, server-side only |

All three are required together. If any is missing, uploads return a
clean `"Image upload is not configured yet"` error (HTTP 503) instead
of crashing — nothing else in the app depends on these being set.

## What's left before real end-to-end confirmation
Same category as every previous phase: the actual Prisma engine still
needs to run somewhere with normal network access (Vercel, or your own
machine) to apply the new migration and let the app talk to a real
database — at that point, uploading a real file end-to-end (through
the UI, hitting real Cloudinary) is the one thing that couldn't be
verified from this sandbox, since it requires live Cloudinary
credentials this environment doesn't have. Everything else — schema,
validation, ownership, routes, UI — is implemented and verified as
thoroughly as this environment allows.
