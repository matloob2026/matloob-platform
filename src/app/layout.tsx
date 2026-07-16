import type { Metadata } from "next";
import "@/styles/globals.css";
import { AuthSessionProvider } from "@/components/providers/AuthSessionProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialogProvider";

export const metadata: Metadata = {
  title: "Matloob",
  description: "منصة الطلبات الأولى — بدل ما تدور... اطلبها.",
};

/**
 * Root layout. Shared by the public marketing site AND the admin
 * dashboard. Fonts are loaded here once so both surfaces render with
 * the correct brand typography (Tajawal/Cairo) instead of a fallback
 * system font.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/*
          The rule below targets the Pages Router's _document.js pattern,
          where a <link> in a single page only loads for that page.
          We're on the App Router; this root layout's <head> applies to
          every route, so the described problem doesn't apply here.
          Switching to next/font/google was considered, but the locked
          marketing homepage's CSS (src/styles/marketing.css) was
          authored against these exact literal font-family names —
          migrating risks subtle rendering drift from the approved
          design for no functional benefit.
        */}
        {/* eslint-disable @next/next/no-page-custom-font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&family=Cairo:wght@600;700;800;900&display=swap"
          rel="stylesheet"
        />
        {/* eslint-enable @next/next/no-page-custom-font */}
      </head>
      <body>
        <AuthSessionProvider>
          <ToastProvider>
            <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
          </ToastProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
