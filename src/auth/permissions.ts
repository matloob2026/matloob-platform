/**
 * Role → permission matrix. See src/auth/README.md (Phase 1) for the
 * rationale: route handlers and layouts call `hasPermission(role, "...")`
 * rather than checking `role === "ADMIN"` inline, so adding a new role
 * (e.g. a scoped `FINANCE_ADMIN`) later touches this file only.
 *
 * Phase 2 status: this matrix is real and used by the mock session guard
 * (src/auth/guards.ts). It does not yet connect to a real database-backed
 * User.role — that lands with full auth integration.
 *
 * CMS FOUNDATION (Checkpoint 01): all content-management permissions
 * (`categories:manage`, `currencies:view`, `pages:view`, `blog:view`, ...)
 * are intentionally granted to ADMIN only (via the "*" wildcard) and are
 * NOT added to MODERATOR's grant list below — CMS management stays an
 * Admin-only area, per this checkpoint's requirements. `categories:view`
 * was already ADMIN-only before this checkpoint; that is unchanged.
 */

export type AdminRole = "ADMIN" | "MODERATOR";

export const ADMIN_PERMISSIONS: Record<AdminRole, readonly string[]> = {
  ADMIN: ["*"],
  MODERATOR: [
    "dashboard:view",
    "requests:view",
    "requests:moderate",
    "offers:view",
    "users:view",
    "media:view",
  ],
};

/**
 * Categories management requires `categories:manage` for write actions
 * (create/update/toggle/delete) — `categories:view` alone (already used
 * to gate the sidebar link and read-only access) is not sufficient. Only
 * ADMIN holds `categories:manage`, via the "*" wildcard above.
 */
export const CATEGORY_MANAGE_PERMISSION = "categories:manage";

/**
 * CMS Checkpoint 02: Homepage Content management (main content,
 * statistics, trust badges) requires `homepage:manage` for write
 * actions — the same pattern as `categories:manage` above.
 * `homepage:view` (already granted to ADMIN only) continues to gate
 * the sidebar link; this is the separate permission the server actions
 * check before touching the database.
 */
export const HOMEPAGE_MANAGE_PERMISSION = "homepage:manage";

/**
 * CMS Checkpoint 03: Static Pages management requires `pages:manage`
 * for write actions (create/update/toggle/delete) — same pattern as
 * `categories:manage`/`homepage:manage` above. `pages:view` (already
 * granted to ADMIN only since Checkpoint 01) continues to gate the
 * sidebar link and read access.
 */
export const PAGE_MANAGE_PERMISSION = "pages:manage";

/**
 * Countries/Cities CMS completion: write actions (create/update/
 * toggle/delete) require `localization:manage` — `localization:view`
 * (already granted to ADMIN only since Checkpoint 01) continues to
 * gate the sidebar link and read access. Same pattern as
 * `categories:manage`/`homepage:manage`/`pages:manage` above.
 */
export const LOCALIZATION_MANAGE_PERMISSION = "localization:manage";

/**
 * Currencies CMS completion: write actions require
 * `currencies:manage` — `currencies:view` (already ADMIN only since
 * Checkpoint 01) continues to gate the sidebar link and read access.
 */
export const CURRENCY_MANAGE_PERMISSION = "currencies:manage";

/**
 * Global Site Settings CMS: write actions require
 * `settings:manage` — `settings:view` (already ADMIN only since
 * Checkpoint 01) continues to gate the sidebar link and read access.
 */
export const SETTINGS_MANAGE_PERMISSION = "settings:manage";

/**
 * SEO CMS: write actions require `seo:manage` — `seo:view` (already
 * ADMIN only since Checkpoint 01) continues to gate the sidebar link
 * and read access.
 */
export const SEO_MANAGE_PERMISSION = "seo:manage";

/**
 * Media Library: write actions (upload/replace/delete) require
 * `media:manage` — ADMIN only, via the "*" wildcard. `media:view`
 * stays granted to MODERATOR too (unchanged since Checkpoint 01) —
 * MODERATOR can browse the library read-only but cannot upload,
 * replace, or delete anything.
 */
export const MEDIA_MANAGE_PERMISSION = "media:manage";

/**
 * Blog module: write actions (create/update/publish/delete) require
 * `blog:manage` — `blog:view` (already ADMIN only since Checkpoint 01
 * — the nav link/placeholder page already used this string) continues
 * to gate the sidebar link and read access. Same pattern as every
 * other CMS area above.
 */
export const BLOG_MANAGE_PERMISSION = "blog:manage";

/**
 * Administration module: Admin Users management (create/update role,
 * status, lock/unlock, trigger password reset) requires
 * `users:manage` — ADMIN only, via the "*" wildcard. `users:view`
 * (already granted to both ADMIN and MODERATOR since Checkpoint 01)
 * continues to gate the sidebar link and read-only access —
 * MODERATOR can view the user list but cannot manage admin accounts.
 */
export const USER_MANAGE_PERMISSION = "users:manage";

/**
 * Administration module: Roles management (create/update/delete a
 * custom `AdminRole`, assign/unassign permissions to it) requires
 * `roles:manage` — ADMIN only, via the "*" wildcard. `roles:view`
 * gates the sidebar link and read-only access, also ADMIN only —
 * assigning extra permissions to other admin accounts is inherently
 * an ADMIN-only capability, never delegated to MODERATOR.
 */
export const ROLE_MANAGE_PERMISSION = "roles:manage";

/**
 * Administration module: the Audit Log viewer is read-only by nature
 * (nothing to "manage") — `audit-log:view` alone gates the sidebar
 * link and the page itself, ADMIN only via the wildcard.
 */
export const AUDIT_LOG_VIEW_PERMISSION = "audit-log:view";

export function hasPermission(role: AdminRole, permission: string): boolean {
  const granted = ADMIN_PERMISSIONS[role];
  return granted.includes("*") || granted.includes(permission);
}

/**
 * The fixed, enumerable catalog of every permission string this
 * codebase actually enforces (every `:manage` constant above, plus
 * every `:view` string used to gate a sidebar link in
 * src/config/admin-nav.ts). This is a DISPLAY catalog for the Roles
 * management screen (src/app/admin/(protected)/roles) — assigning one
 * of these to a custom `AdminRole` only ever has an effect because a
 * real `requirePermission(...)` call somewhere already checks that
 * exact string; there is no mechanism to invent a new, functionally
 * meaningless permission string here.
 *
 * Deliberately EXCLUDED from this catalog: `users:manage` and
 * `roles:manage`/`roles:view`. Granting either to a custom role would
 * let a MODERATOR edit roles (including their own) or promote a user
 * (including themselves) to ADMIN — a privilege-escalation path. Both
 * stay ADMIN-only via the wildcard, permanently, with no path to
 * delegate them through this system.
 */
export interface PermissionCatalogEntry {
  permission: string;
  label: string;
}

export const PERMISSION_CATALOG: PermissionCatalogEntry[] = [
  { permission: "dashboard:view", label: "عرض لوحة التحكم" },
  { permission: "requests:view", label: "عرض الطلبات" },
  { permission: "requests:moderate", label: "الإشراف على الطلبات" },
  { permission: "offers:view", label: "عرض العروض" },
  { permission: "users:view", label: "عرض المستخدمين" },
  { permission: "homepage:view", label: "عرض محتوى الرئيسية" },
  { permission: HOMEPAGE_MANAGE_PERMISSION, label: "إدارة محتوى الرئيسية" },
  { permission: "categories:view", label: "عرض التصنيفات" },
  { permission: CATEGORY_MANAGE_PERMISSION, label: "إدارة التصنيفات" },
  { permission: "localization:view", label: "عرض الدول والمدن" },
  { permission: LOCALIZATION_MANAGE_PERMISSION, label: "إدارة الدول والمدن" },
  { permission: "currencies:view", label: "عرض العملات" },
  { permission: CURRENCY_MANAGE_PERMISSION, label: "إدارة العملات" },
  { permission: "pages:view", label: "عرض الصفحات الثابتة" },
  { permission: PAGE_MANAGE_PERMISSION, label: "إدارة الصفحات الثابتة" },
  { permission: "blog:view", label: "عرض المدونة" },
  { permission: BLOG_MANAGE_PERMISSION, label: "إدارة المدونة" },
  { permission: "media:view", label: "عرض مكتبة الوسائط" },
  { permission: MEDIA_MANAGE_PERMISSION, label: "إدارة مكتبة الوسائط" },
  { permission: "seo:view", label: "عرض إعدادات SEO" },
  { permission: SEO_MANAGE_PERMISSION, label: "إدارة إعدادات SEO" },
  { permission: "settings:view", label: "عرض إعدادات الموقع" },
  { permission: SETTINGS_MANAGE_PERMISSION, label: "إدارة إعدادات الموقع" },
  { permission: "ai:view", label: "عرض الذكاء الاصطناعي" },
];
