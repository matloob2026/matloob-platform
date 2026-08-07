"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { User, ClipboardList, HandCoins, MessageCircle, Bell, Bookmark, Settings, LogOut, ChevronLeft, ChevronDown, X } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { NOTIFICATION_READ_EVENT, type NotificationReadEventDetail } from "@/lib/notification-events";
import type { NotificationItem } from "@/types/domain";

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
  const [unreadCount, setUnreadCount] = useState(0);
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

  // Workflow Integration phase (item 4): "unread counters must update
  // correctly" — fetched once on mount (this component only ever
  // mounts for an authenticated viewer, see SiteHeader's
  // status === "authenticated" gate) and re-fetched on every full page
  // navigation, since UserMenu remounts fresh on each page the same
  // way the rest of this app relies on a full re-render instead of a
  // realtime layer.
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ data: NotificationItem[] }>("/api/notifications?unreadOnly=true")
      .then((res) => {
        if (!cancelled) setUnreadCount(res.data.length);
      })
      .catch(() => {
        // Non-critical UI affordance — a failed count fetch shouldn't
        // surface an error toast to the user.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Notifications UX pass: "the unread badge must decrease instantly"
  // — NotificationRow (rendered on /notifications, potentially far
  // from this component in the tree) dispatches this event the moment
  // a notification is opened, so the badge updates immediately without
  // waiting for this component's own page to reload.
  useEffect(() => {
    function handleNotificationRead(e: Event) {
      const detail = (e as CustomEvent<NotificationReadEventDetail>).detail;
      const decrement = detail?.count ?? 1;
      setUnreadCount((current) => Math.max(0, current - decrement));
    }
    window.addEventListener(NOTIFICATION_READ_EVENT, handleNotificationRead);
    return () => window.removeEventListener(NOTIFICATION_READ_EVENT, handleNotificationRead);
  }, []);

  // Mobile profile menu (UX pass, item 7): the drawer covers the
  // screen, so scrolling the page behind it while it's open would be
  // disorienting — same body-scroll-lock convention the homepage's
  // own mobile nav drawer already uses (see toggleMobileMenu in
  // public/marketing/homepage-scripts.js).
  useEffect(() => {
    if (open) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [open]);

  const initial = name.trim().charAt(0).toUpperCase() || "؟";

  const menuItems = [
    { href: "/profile", label: "الملف الشخصي", Icon: User },
    { href: "/my-requests", label: "طلباتي", Icon: ClipboardList },
    { href: "/my-offers", label: "عروضي", Icon: HandCoins },
    { href: "/conversations", label: "المحادثات", Icon: MessageCircle },
    { href: "/saved-requests", label: "المحفوظات", Icon: Bookmark },
    { href: "/notifications", label: "الإشعارات", Icon: Bell, badge: unreadCount },
    { href: "/account-settings", label: "إعدادات الحساب", Icon: Settings },
  ];

  const avatar = imageUrl ? (
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
  );

  // Shared between the desktop dropdown and the mobile drawer — same
  // rows, same order, same badge — so the two surfaces never drift
  // out of sync with each other.
  function renderMenuLinks() {
    return menuItems.map(({ href, label, Icon, badge }) => (
      <Link
        key={href}
        href={href}
        role="menuitem"
        onClick={() => setOpen(false)}
        className="flex cursor-pointer items-center gap-3.5 rounded-xl px-4 py-3.5 text-sm font-medium text-navy-950 transition-colors duration-150 hover:bg-[#F5F7FA]"
      >
        <Icon size={19} strokeWidth={1.8} className="text-text-500" />
        {label}
        {!!badge && (
          <span className="mr-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">
            {badge}
          </span>
        )}
      </Link>
    ));
  }

  function handleLogout() {
    setOpen(false);
    signOut({ callbackUrl: "/" });
  }

  return (
    <div dir="rtl" className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center rounded-full border border-border bg-white p-1 shadow-sm transition-all hover:shadow-md"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={name}
      >
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
        {!!unreadCount && (
          <span className="absolute -left-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-600 sm:hidden" />
        )}
        <ChevronDown
          size={15}
          strokeWidth={2.4}
          className={`mx-1 hidden text-text-400 transition-transform duration-200 sm:inline-block ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Desktop dropdown (sm and up) — 320px, 20px rounding, soft deep
          shadow, 200ms fade+slide. Unchanged from before, just now
          explicitly scoped to sm:+ since mobile gets its own drawer
          below. */}
      <div
        className={`absolute left-0 z-50 mt-3 hidden w-80 origin-top-left overflow-hidden rounded-[20px] border border-border bg-white shadow-[0_20px_60px_-15px_rgba(15,42,74,0.35)] transition-all duration-200 ease-out sm:block ${
          open
            ? "visible translate-y-0 scale-100 opacity-100"
            : "invisible -translate-y-2 scale-95 opacity-0"
        }`}
        role="menu"
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3 px-7 py-7">
          {avatar}
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
        <div className="border-t border-border px-3 py-3">{renderMenuLinks()}</div>

        <div className="border-t border-border px-3 py-3">
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
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

      {/* Mobile profile drawer (below sm) — a real slide-in panel,
          not a scaled-down dropdown: opens from the right, ~78% of
          the viewport width, rounded left corners, dark overlay
          behind it, closes on outside click or the × button. Always
          rendered (never conditionally unmounted) so the slide-out
          animation plays on close too, same technique the desktop
          dropdown above already uses for its own open/close
          transition, just translate-x instead of translate-y/scale. */}
      <div
        className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-[1px] transition-opacity duration-300 sm:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-y-0 right-0 z-[70] flex w-[78%] max-w-xs flex-col overflow-hidden rounded-l-[24px] bg-white shadow-[0_0_40px_rgba(15,42,74,0.35)] transition-transform duration-300 ease-out sm:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="قائمة الحساب"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="font-display text-base font-extrabold text-navy-950">حسابي</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="إغلاق"
            className="rounded-full p-2 text-text-500 transition-colors hover:bg-surface-muted"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 border-b border-border px-6 py-6">
          {avatar}
          <div className="text-center">
            <p className="truncate text-base font-extrabold text-navy-950">{name}</p>
            {email && <p className="mt-0.5 truncate text-xs text-text-400">{email}</p>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">{renderMenuLinks()}</div>

        <div className="border-t border-border px-3 py-3">
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center gap-3.5 rounded-xl px-4 py-3.5 text-right text-sm font-semibold text-red-600 transition-colors duration-150 hover:bg-red-50"
          >
            <LogOut size={19} strokeWidth={1.8} />
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}
