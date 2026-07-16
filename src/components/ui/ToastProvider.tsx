"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const TYPE_STYLES: Record<ToastType, { icon: string; accent: string }> = {
  success: { icon: "✓", accent: "border-teal-200 bg-teal-50 text-teal-800" },
  error: { icon: "✕", accent: "border-red-200 bg-red-50 text-red-700" },
  warning: { icon: "!", accent: "border-amber-200 bg-amber-50 text-amber-800" },
  info: { icon: "ℹ", accent: "border-blue-200 bg-blue-50 text-blue-800" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div dir="rtl" className="pointer-events-none fixed left-0 right-0 top-4 z-[100] flex flex-col items-end gap-2 px-4">
        {toasts.map((toast) => {
          const style = TYPE_STYLES[toast.type];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex max-w-sm animate-[toast-in_0.25s_ease-out] items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-sm ${style.accent}`}
            >
              <span className="font-display text-sm font-extrabold text-navy-950">مطلوب</span>
              <span className="h-4 w-px bg-current opacity-20" aria-hidden="true" />
              <span aria-hidden="true" className="text-base font-bold">
                {style.icon}
              </span>
              <span className="text-sm font-semibold">{toast.message}</span>
            </div>
          );
        })}
      </div>
      <style jsx global>{`
        @keyframes toast-in {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
