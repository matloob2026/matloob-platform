import { Search } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { MobileSidebarToggle } from "./MobileSidebarToggle";
import type { AdminSession } from "@/auth/mock-session";

interface AdminTopbarProps {
  session: AdminSession;
}

export function AdminTopbar({ session }: AdminTopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-white/90 px-4 backdrop-blur lg:px-8">
      <MobileSidebarToggle />

      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-400" />
        <input
          type="search"
          placeholder="بحث في لوحة التحكم..."
          className="w-full rounded-lg border border-border-strong bg-surface-muted py-2 pr-10 pl-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        <NotificationBell />
        <div className="mx-1 h-6 w-px bg-border" />
        <UserMenu name={session.name} email={session.email} role={session.role} />
      </div>
    </header>
  );
}
