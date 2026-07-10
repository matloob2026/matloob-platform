# Components

- `ui/` — framework-level primitives (Button, Input, Card, Modal...).
  No business logic, no data fetching. Pure presentational + accessible.
- `hero/` — hero section components (RequestBar, FloatingImageCollage...).
  This is where the locked UI design's hero markup/interaction gets
  ported into React.
- `requests/` — RequestCard, RequestGrid, RequestFilters.
- `categories/` — CategoryTile, CategoryGrid.
- `admin/` — DataTable, MediaPicker, TranslationTabs, RichTextEditor
  (see /src/admin/README.md for how these compose into dashboard pages).
- `shared/` — Header, Footer, MobileNav — used across both marketing
  and (where relevant) admin layouts.

Rule: components receive data as props or via a hook (`src/hooks`).
They never import a service or Prisma directly — that keeps every
component testable/storybook-able in isolation.
