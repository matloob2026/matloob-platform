/**
 * Single source of truth for the admin sidebar. Adding a new admin
 * section means adding one entry here — the sidebar, breadcrumbs, and
 * (future) permission checks all read from this file rather than
 * duplicating route/label pairs across components.
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  HandCoins,
  LayoutGrid,
  MapPin,
  Home,
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

export const ADMIN_NAV: NavItem[] = [
  { label: "لوحة التحكم", href: "/admin/dashboard", icon: LayoutDashboard, permission: "dashboard:view" },
  { label: "المستخدمون", href: "/admin/users", icon: Users, permission: "users:view" },
  { label: "الطلبات", href: "/admin/requests", icon: ClipboardList, permission: "requests:view" },
  { label: "العروض", href: "/admin/offers", icon: HandCoins, permission: "offers:view" },
  { label: "التصنيفات", href: "/admin/categories", icon: LayoutGrid, permission: "categories:view" },
  { label: "المدن والدول", href: "/admin/localization", icon: MapPin, permission: "localization:view" },
  { label: "إدارة الرئيسية", href: "/admin/homepage", icon: Home, permission: "homepage:view" },
  { label: "مكتبة الوسائط", href: "/admin/media", icon: ImageIcon, permission: "media:view" },
  { label: "SEO", href: "/admin/seo", icon: Search, permission: "seo:view" },
  { label: "الإعدادات", href: "/admin/settings", icon: Settings, permission: "settings:view" },
  { label: "الذكاء الاصطناعي", href: "/admin/ai", icon: Sparkles, permission: "ai:view" },
];
