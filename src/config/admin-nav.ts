/**
 * Single source of truth for the admin sidebar. Adding a new admin
 * section means adding one entry here — the sidebar, breadcrumbs, and
 * permission checks all read from this file rather than duplicating
 * route/label pairs across components.
 *
 * CMS FOUNDATION (Checkpoint 01): items are organized into labeled
 * groups so the sidebar can show a clear, professional information
 * architecture as more content-management screens are added. Grouping
 * is presentation-only — permission checks and breadcrumb resolution
 * still operate on the flat `ADMIN_NAV` list below (unchanged shape),
 * so nothing that already reads `ADMIN_NAV` (e.g. Breadcrumbs) needed
 * to change.
 *
 * Every "إدارة المحتوى" (Content Management / CMS) item reuses an
 * existing page and existing data model wherever one already exists
 * (Homepage Content, Hero Section, Categories, Countries, Cities) —
 * see each item's comment. Items with no existing page yet (Currencies,
 * Static Pages, Blog/Articles) get a placeholder screen that states
 * what it will manage and reuses the same "قريباً" pattern already
 * used by the AI screen, rather than a fake/mock management UI.
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  HandCoins,
  LayoutGrid,
  Home,
  LayoutTemplate,
  Globe2,
  Building2,
  Coins,
  FileText,
  Newspaper,
  Image as ImageIcon,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: string;
}

export interface NavGroup {
  /** Omitted for the top-level pinned item (Dashboard). */
  title?: string;
  items: NavItem[];
}

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "لوحة التحكم", href: "/admin/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
    ],
  },
  {
    title: "العمليات",
    items: [
      { label: "المستخدمون", href: "/admin/users", icon: Users, permission: "users:view" },
      { label: "الطلبات", href: "/admin/requests", icon: ClipboardList, permission: "requests:view" },
      { label: "العروض", href: "/admin/offers", icon: HandCoins, permission: "offers:view" },
    ],
  },
  {
    title: "إدارة المحتوى (CMS)",
    items: [
      // Reuses the existing /admin/homepage page (PageContent/HomepageStat/
      // TrustBadge/SocialLink models) — see docs/ADMIN_DASHBOARD.md.
      { label: "محتوى الرئيسية", href: "/admin/homepage", icon: Home, permission: "homepage:view" },
      // Same page, deep-linked to its existing "hero" tab — the Hero
      // Section is not a duplicate screen, it's the existing homepage
      // editor's Hero tab (see CategoriesSection note in that page
      // about avoiding duplicate management UIs for the same data).
      { label: "القسم الرئيسي (Hero)", href: "/admin/homepage?tab=hero", icon: LayoutTemplate, permission: "homepage:view" },
      // Real, database-backed as of Checkpoint 01 — Category/CategoryTranslation.
      { label: "التصنيفات", href: "/admin/categories", icon: LayoutGrid, permission: "categories:view" },
      // Reuses the existing /admin/localization page's "countries" tab
      // (Country/CountryTranslation/CountryCurrency) — no duplicate model.
      { label: "الدول", href: "/admin/localization?tab=countries", icon: Globe2, permission: "localization:view" },
      // Same page's "cities" tab (City/CityTranslation).
      { label: "المدن", href: "/admin/localization?tab=cities", icon: Building2, permission: "localization:view" },
      // No existing screen yet — foundation/placeholder only this checkpoint.
      { label: "العملات", href: "/admin/currencies", icon: Coins, permission: "currencies:view" },
      { label: "الصفحات الثابتة", href: "/admin/pages", icon: FileText, permission: "pages:view" },
      { label: "المدونة / المقالات", href: "/admin/blog", icon: Newspaper, permission: "blog:view" },
    ],
  },
  {
    title: "النظام",
    items: [
      { label: "مكتبة الوسائط", href: "/admin/media", icon: ImageIcon, permission: "media:view" },
      { label: "SEO", href: "/admin/seo", icon: Search, permission: "seo:view" },
      { label: "الإعدادات", href: "/admin/settings", icon: Settings, permission: "settings:view" },
      { label: "الذكاء الاصطناعي", href: "/admin/ai", icon: Sparkles, permission: "ai:view" },
    ],
  },
];

/** Flat list — unchanged shape/order-independent consumers (Breadcrumbs,
 * permission filtering) key off `href`, not group position. */
export const ADMIN_NAV: NavItem[] = ADMIN_NAV_GROUPS.flatMap((group) => group.items);
