"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ADMIN_NAV } from "@/config/admin-nav";

/**
 * Derives breadcrumb trail from the current pathname + ADMIN_NAV labels,
 * with an optional override for the current (leaf) segment label —
 * e.g. a Request detail page passes the request's title.
 */
export function Breadcrumbs({ current }: { current?: string }) {
  const pathname = usePathname() ?? "/admin/dashboard";
  const segments = pathname.split("/").filter(Boolean); // ["admin", "requests", "123"]

  const topLevelHref = `/${segments.slice(0, 2).join("/")}`;
  const topLevelItem = ADMIN_NAV.find((item) => item.href === topLevelHref);

  return (
    <nav className="mb-4 flex items-center gap-1.5 text-sm text-text-400">
      <Link href="/admin/dashboard" className="transition hover:text-teal-600">
        لوحة التحكم
      </Link>
      {topLevelItem && topLevelItem.href !== "/admin/dashboard" && (
        <>
          <ChevronLeft className="h-3.5 w-3.5" />
          <Link href={topLevelItem.href} className="transition hover:text-teal-600">
            {topLevelItem.label}
          </Link>
        </>
      )}
      {current && (
        <>
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="font-semibold text-navy-950">{current}</span>
        </>
      )}
    </nav>
  );
}
