/**
 * UI placeholders only — Google/Apple OAuth is not implemented yet.
 * See the TODO in src/auth/auth.config.ts for the real wiring point
 * (OAuthAccount already exists in prisma/schema.prisma for this).
 * These buttons are intentionally disabled so they can't be clicked
 * and mistaken for working sign-in options.
 */
export function OAuthPlaceholders() {
  return (
    <div dir="rtl" className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-text-400">
        <span className="h-px flex-1 bg-border" />
        أو قريباً
        <span className="h-px flex-1 bg-border" />
      </div>
      <button
        type="button"
        disabled
        title="قريباً"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-400 opacity-60 cursor-not-allowed"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
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
        المتابعة عبر Apple
      </button>
    </div>
  );
}
