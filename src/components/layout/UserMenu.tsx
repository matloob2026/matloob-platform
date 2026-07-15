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
        className="flex items-center gap-2.5 rounded-full border border-border bg-white py-1 pl-1.5 pr-4 shadow-sm transition-shadow hover:shadow-md"
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

      <div
        className={`absolute left-0 z-50 mt-3 w-64 origin-top-left overflow-hidden rounded-2xl border border-border bg-white shadow-2xl transition-all duration-150 ease-out ${
          open ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-1 scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={name} className="h-12 w-12 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-950 text-base font-bold text-white">
              {initial}
            </span>
          )}
          <span className="truncate text-sm font-bold text-navy-950">{name}</span>
        </div>

        <div className="py-2">
          <Link
            href="/profile"
            className="block px-5 py-3 text-sm font-medium text-navy-950 transition-colors hover:bg-teal-50 hover:text-teal-700"
            onClick={() => setOpen(false)}
          >
            الملف الشخصي
          </Link>
          <Link
            href="/my-requests"
            className="block px-5 py-3 text-sm font-medium text-navy-950 transition-colors hover:bg-teal-50 hover:text-teal-700"
            onClick={() => setOpen(false)}
          >
            طلباتي
          </Link>
        </div>

        <div className="border-t border-border py-2">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="block w-full px-5 py-3 text-right text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}
