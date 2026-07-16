"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

function ProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.7-3.8 5-5.5 7.5-5.5s5.8 1.7 7.5 5.5" />
    </svg>
  );
}

function RequestsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M9 10h6M9 14h6M9 18h3" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3" />
      <path d="M15 16l4-4-4-4M19 12H9" />
    </svg>
  );
}

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

      <div
        className={`absolute left-0 z-50 mt-3 w-72 origin-top-left overflow-hidden rounded-[20px] border border-border bg-white shadow-2xl transition-all duration-200 ease-out ${
          open ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-2 scale-95 opacity-0"
        }`}
      >
        <div className="flex flex-col items-center gap-3 px-6 py-6">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={name}
              className="h-16 w-16 rounded-full object-cover shadow-sm"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-950 text-xl font-bold text-white shadow-sm">
              {initial}
            </span>
          )}
          <div className="text-center">
            <p className="truncate text-base font-extrabold text-navy-950">{name}</p>
            {email && <p className="mt-0.5 truncate text-xs text-text-400">{email}</p>}
          </div>
        </div>

        <div className="border-t border-border px-2 py-2">
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-navy-950 transition-colors hover:bg-teal-50 hover:text-teal-700"
            onClick={() => setOpen(false)}
          >
            <ProfileIcon />
            الملف الشخصي
          </Link>
          <Link
            href="/my-requests"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-navy-950 transition-colors hover:bg-teal-50 hover:text-teal-700"
            onClick={() => setOpen(false)}
          >
            <RequestsIcon />
            طلباتي
          </Link>
        </div>

        <div className="border-t border-border px-2 py-2">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            <LogoutIcon />
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}
