"use client";

import { forwardRef, useState } from "react";
import { Input } from "./Field";

/**
 * Same visual language as Field.tsx's `Input` (in fact wraps it
 * directly) — just adds a show/hide toggle. Used anywhere a password
 * is entered (Login, Register, Reset Password).
 */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">
>(({ className, ...props }, ref) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input ref={ref} type={visible ? "text" : "password"} className={`pl-10 ${className ?? ""}`} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        className="absolute inset-y-0 left-0 flex items-center px-3 text-text-400 hover:text-text-700"
      >
        {visible ? (
          // eye-off icon
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 4.24A9.7 9.7 0 0112 4c5 0 9 4 10 8-.31 1.1-.86 2.14-1.6 3.05M6.5 6.6C3.9 8.15 2.16 10.5 1.5 12c.86 3 3.9 6.5 8.5 6.5 1.28 0 2.47-.27 3.53-.74" />
          </svg>
        ) : (
          // eye icon
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";
