"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Wraps the app so client components can call useSession() and get
 * reactive updates (e.g. the header switching from Login/Register to
 * the user's avatar immediately after sign-in, no page refresh
 * needed). Safe to wrap the whole app, including the admin dashboard —
 * admin uses its own separate mock-session system (src/auth/guards.ts)
 * and simply doesn't call useSession(), so there's no conflict.
 */
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
