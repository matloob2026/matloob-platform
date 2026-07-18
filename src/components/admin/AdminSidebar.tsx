"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { X } from "lucide-react";
import { ADMIN_NAV_GROUPS } from "@/config/admin-nav";
import { hasPermission, type AdminRole } from "@/auth/permissions";
import { useMobileNav } from "./MobileNavContext";

interface AdminSidebarProps {
  role: AdminRole;
}

export function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname();
  const { isOpen, close } = useMobileNav();
  // Groups (and section headers) whose items are all hidden for this role
  // simply disappear — a MODERATOR never sees an empty "CMS" heading.
  const visibleGroups = ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => hasPermission(role, item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-navy-950/40 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          "admin-scroll fixed inset-y-0 right-0 z-40 flex w-64 flex-col overflow-y-auto border-l border-border bg-white transition-transform duration-200 lg:translate-x-0",
          isOpen ? "translate-x-0" : "translate-x-full",
          "lg:z-30"
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-l from-navy-900 to-teal-500 font-display text-sm font-extrabold text-white">
              م
            </div>
            <span className="font-display text-lg font-extrabold text-navy-950">مطلوب</span>
          </div>
          <button
            onClick={close}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-text-400 transition hover:bg-surface-muted hover:text-navy-950 lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 px-3 py-4">
          {visibleGroups.map((group, groupIndex) => (
            <div key={group.title ?? `group-${groupIndex}`} className="space-y-1">
              {group.title && (
                <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-text-400">
                  {group.title}
                </p>
              )}
              {group.items.map((item) => {
                // Compare on pathname only (query strings like ?tab=hero
                // aren't part of usePathname()), so a deep-linked item such
                // as "Hero Section" still highlights while on its page.
                const itemPath = item.href.split("?")[0];
                const isActive = pathname === itemPath || pathname?.startsWith(itemPath + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className={clsx(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                      isActive
                        ? "bg-teal-50 text-navy-950 font-bold"
                        : "text-text-700 hover:bg-surface-muted hover:text-navy-950"
                    )}
                  >
                    <Icon className={clsx("h-[18px] w-[18px]", isActive ? "text-teal-600" : "text-text-400")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-4 text-center text-[11px] text-text-400">
          Matloob Admin — v0.1 (Phase 2)
        </div>
      </aside>
    </>
  );
}
