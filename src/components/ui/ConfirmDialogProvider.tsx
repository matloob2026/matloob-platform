"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Button } from "./Button";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue["confirm"] {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmDialogProvider>");
  return ctx.confirm;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  function close(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-navy-950/40 px-4 backdrop-blur-sm animate-[modal-backdrop-in_0.15s_ease-out]"
          onClick={() => close(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm animate-[modal-in_0.2s_ease-out] rounded-[20px] bg-white p-6 text-center shadow-2xl"
          >
            <p className="font-display text-base font-extrabold text-navy-950">مطلوب</p>
            <h2 className="mt-3 text-lg font-extrabold text-navy-950">{pending.title}</h2>
            {pending.message && <p className="mt-2 text-sm leading-relaxed text-text-500">{pending.message}</p>}

            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => close(false)}>
                {pending.cancelLabel ?? "إلغاء"}
              </Button>
              <Button
                variant={pending.danger ? "danger" : "primary"}
                className="flex-1"
                onClick={() => close(true)}
              >
                {pending.confirmLabel ?? "تأكيد"}
              </Button>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        @keyframes modal-backdrop-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes modal-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </ConfirmContext.Provider>
  );
}
