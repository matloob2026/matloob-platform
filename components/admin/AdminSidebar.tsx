"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { X } from "lucide-react";
import { ADMIN_NAV } from "@/config/admin-nav";
import { hasPermission, type AdminRole } from "@/auth/permissions";
import { useMobileNav } from "./MobileNavContext";

interface AdminSidebarProps {
  role: AdminRole;
}

export function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname();
  const { isOpen, close } = useMobileNav();
  const visibleItems = ADMIN_NAV.filter((item) => hasPermission(role, item.permission));

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

        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
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
        </nav>

        <div className="border-t border-border p-4 text-center text-[11px] text-text-400">
          Matloob Admin — v0.1 (Phase 2)
        </div>
      </aside>
    </>
  );
}
