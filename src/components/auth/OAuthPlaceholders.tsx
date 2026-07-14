"use client";

import { signIn } from "next-auth/react";

/**
 * Google is fully wired to NextAuth (see src/auth/auth.config.ts —
 * registered only when GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are set;
 * clicking this when it isn't configured server-side just surfaces
 * NextAuth's normal "no such provider" error on /login, same as any
 * misconfigured provider). Styled to match Google's own official
 * Sign-In button branding (white surface, subtle border, full-color
 * "G" logo, Google's exact brand colors) instead of a generic
 * greyscale button, so it reads as a real, active sign-in option.
 *
 * Apple stays a disabled placeholder — see the TODO in auth.config.ts
 * for the real wiring point when that's implemented (OAuthAccount
 * already models it, no schema change needed).
 */
export function OAuthPlaceholders({ callbackUrl }: { callbackUrl?: string }) {
  return (
    <div dir="rtl" className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-text-400">
        <span className="h-px flex-1 bg-border" />
        أو
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: callbackUrl ?? "/" })}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#dadce0] bg-white px-4 py-2.5 text-sm font-medium text-[#3c4043] shadow-sm transition-shadow hover:shadow-md active:bg-[#f8f9fa]"
      >
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#FFC107"
            d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"
          />
          <path
            fill="#FF3D00"
            d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44Z"
          />
          <path
            fill="#1976D2"
            d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"
          />
        </svg>
        المتابعة عبر Google
      </button>

      <button
        type="button"
        disabled
        title="قريباً"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-400 opacity-60 cursor-not-allowed"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M16.365 1.43c0 1.14-.468 2.145-1.15 2.885-.78.84-2.062 1.494-3.09 1.41-.132-1.11.42-2.28 1.14-3.03.78-.81 2.145-1.41 3.1-1.265Zm3.63 15.36c-.09.24-.5 1.68-1.65 3.33-.99 1.42-2.01 2.85-3.63 2.88-1.59.03-2.1-.93-3.92-.93-1.83 0-2.4.9-3.9.96-1.56.06-2.76-1.53-3.75-2.94C1.71 17.16.6 12.66 2.13 9.66c.75-1.5 2.1-2.46 3.57-2.49 1.5-.03 2.91.99 3.83.99.9 0 2.61-1.23 4.41-1.05.75.03 2.85.3 4.2 2.28-.11.07-2.5 1.44-2.48 4.31.03 3.44 3.06 4.58 3.09 4.6Z"
          />
        </svg>
        المتابعة عبر Apple (قريباً)
      </button>
    </div>
  );
}
