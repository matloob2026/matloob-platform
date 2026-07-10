# Hooks

Client-side data-fetching and stateful logic, thin wrappers around
`src/lib/api-client.ts` + `src/types/domain.ts`. Examples to implement
in Phase 2:

- `useRequests(filter)` — paginated request list
- `useCreateRequest()` — mutation wrapper for the Create Request flow,
  including the "transfer hero bar text" hand-off from the homepage
- `useAuth()` — current session/user
- `useHomepageConfig(locale)` — client-side re-fetch if needed (the
  initial load is server-rendered via HomepageContentService directly)

Rule: hooks call `apiFetch()` / route handlers, never `services/*`
directly — hooks run in the browser, services run on the server.
