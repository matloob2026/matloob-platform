"use client";

import { Menu } from "lucide-react";
import { useMobileNav } from "./MobileNavContext";

export function MobileSidebarToggle() {
  const { toggle } = useMobileNav();
  return (
    <button
      onClick={toggle}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-text-500 transition hover:bg-surface-muted lg:hidden"
      aria-label="فتح القائمة"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
