"use client";

import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import clsx from "clsx";

/**
 * Mock notifications — Phase 2 UI only. Real implementation reads from
 * NotificationService.listForUser() (see src/services/notification.service.ts,
 * Phase 1) once the admin's own account is a real User row.
 */
const MOCK_NOTIFICATIONS = [
  { id: "1", title: "طلب جديد بحاجة لمراجعة", time: "منذ 5 دقائق", isRead: false },
  { id: "2", title: "بلاغ جديد على طلب", time: "منذ ساعة", isRead: false },
  { id: "3", title: "مورد جديد ينتظر التوثيق", time: "منذ 3 ساعات", isRead: true },
];

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length;

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
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-text-500 transition hover:bg-surface-muted"
        aria-label="الإشعارات"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-80 rounded-xl border border-border bg-white shadow-card-lg">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-bold text-navy-950">الإشعارات</p>
          </div>
          <div className="max-h-80 overflow-y-auto admin-scroll">
            {MOCK_NOTIFICATIONS.map((n) => (
              <div
                key={n.id}
                className={clsx(
                  "border-b border-border px-4 py-3 text-sm last:border-0",
                  !n.isRead && "bg-teal-50/40"
                )}
              >
                <p className="font-medium text-text-700">{n.title}</p>
                <p className="mt-1 text-xs text-text-400">{n.time}</p>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 text-center">
            <button className="text-xs font-bold text-teal-600">عرض كل الإشعارات</button>
          </div>
        </div>
      )}
    </div>
  );
}
