"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { User, ClipboardList, LogOut, ChevronLeft } from "lucide-react";

export function UserMenu({
  name,
  email,
  imageUrl,
}: {
  name: string;
  email?: string | null;
  imageUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initial = name.trim().charAt(0).toUpperCase() || "؟";

  const menuItems = [
    { href: "/profile", label: "الملف الشخصي", Icon: User },
    { href: "/my-requests", label: "طلباتي", Icon: ClipboardList },
  ];

  return (
    <div dir="rtl" className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-full border border-border bg-white py-1 pl-1.5 pr-4 shadow-sm transition-all hover:shadow-md"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="max-w-[140px] truncate text-sm font-semibold text-navy-950">{name}</span>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- small fixed-size avatar in a dropdown trigger; next/image's overhead isn't warranted here
          <img
            src={imageUrl}
            alt={name}
            className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-950 text-sm font-bold text-white ring-2 ring-white">
            {initial}
          </span>
        )}
      </button>

      {/* Premium dropdown — 320px, 20px rounding, soft deep shadow, 200ms fade+slide */}
      <div
        className={`absolute left-0 z-50 mt-3 w-80 origin-top-left overflow-hidden rounded-[20px] border border-border bg-white shadow-[0_20px_60px_-15px_rgba(15,42,74,0.35)] transition-all duration-200 ease-out ${
          open
            ? "visible translate-y-0 scale-100 opacity-100"
            : "invisible -translate-y-2 scale-95 opacity-0"
        }`}
        role="menu"
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3 px-7 py-7">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={name}
              className="h-12 w-12 rounded-full object-cover shadow-sm"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-950 text-lg font-bold text-white shadow-sm">
              {initial}
            </span>
          )}
          <div className="text-center">
            <p className="truncate text-base font-extrabold text-navy-950">{name}</p>
            {email && <p className="mt-0.5 truncate text-xs text-text-400">{email}</p>}
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
          >
            عرض الملف الشخصي
            <ChevronLeft size={14} />
          </Link>
        </div>

        {/* Menu items */}
        <div className="border-t border-border px-3 py-3">
          {menuItems.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex cursor-pointer items-center gap-3.5 rounded-xl px-4 py-3.5 text-sm font-medium text-navy-950 transition-colors duration-150 hover:bg-[#F5F7FA]"
            >
              <Icon size={19} strokeWidth={1.8} className="text-text-500" />
              {label}
            </Link>
          ))}
        </div>

        <div className="border-t border-border px-3 py-3">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: "/" });
            }}
            className="flex w-full cursor-pointer items-center gap-3.5 rounded-xl px-4 py-3.5 text-right text-sm font-semibold text-red-600 transition-colors duration-150 hover:bg-red-50"
          >
            <LogOut size={19} strokeWidth={1.8} />
            تسجيل الخروج
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 text-center">
          <p className="text-[11px] font-medium text-text-400">منصة مطلوب</p>
        </div>
      </div>
    </div>
  );
}
