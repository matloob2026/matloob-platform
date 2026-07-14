"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

export function UserMenu({
  name,
  imageUrl,
}: {
  name: string;
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

  return (
    <div dir="rtl" className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border bg-white py-1 pl-1 pr-3 text-sm font-semibold text-navy-950 hover:bg-surface-muted"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="max-w-[120px] truncate">{name}</span>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- small fixed-size avatar in a dropdown trigger; next/image's overhead isn't warranted here
          <img src={imageUrl} alt={name} className="h-7 w-7 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-950 text-xs font-bold text-white">
            {initial}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-white shadow-lg">
          <Link
            href="/profile"
            className="block px-4 py-2.5 text-sm text-navy-950 hover:bg-surface-muted"
            onClick={() => setOpen(false)}
          >
            الملف الشخصي
          </Link>
          <Link
            href="/my-requests"
            className="block px-4 py-2.5 text-sm text-navy-950 hover:bg-surface-muted"
            onClick={() => setOpen(false)}
          >
            طلباتي
          </Link>
          <button
            type="button"
            disabled
            title="قريباً"
            className="block w-full px-4 py-2.5 text-right text-sm text-text-400 opacity-60 cursor-not-allowed"
          >
            الإعدادات (قريباً)
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="block w-full border-t border-border px-4 py-2.5 text-right text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            تسجيل الخروج
          </button>
        </div>
      )}
    </div>
  );
}
