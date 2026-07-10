"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { logoutAction } from "@/app/admin/login/actions";

interface UserMenuProps {
  name: string;
  email: string;
  role: string;
}

export function UserMenu({ name, email, role }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-surface-muted"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-l from-navy-900 to-teal-500 text-sm font-bold text-white">
          {name.charAt(0)}
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-bold text-navy-950">{name}</p>
          <p className="text-xs text-text-400">{role === "ADMIN" ? "مدير" : "مشرف"}</p>
        </div>
        <ChevronDown className="h-4 w-4 text-text-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-56 rounded-xl border border-border bg-white p-2 shadow-card-lg">
          <div className="border-b border-border px-3 py-2">
            <p className="text-sm font-bold text-navy-950">{name}</p>
            <p className="truncate text-xs text-text-400">{email}</p>
          </div>
          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-700 transition hover:bg-surface-muted">
            <UserIcon className="h-4 w-4" /> الملف الشخصي
          </button>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" /> تسجيل الخروج
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
