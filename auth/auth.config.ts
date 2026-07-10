/**
 * NextAuth.js (Auth.js) v5 configuration.
 *
 * Per src/auth/README.md: Credentials provider backed by `passwordHash`
 * on `User`, JWT session strategy (not DB sessions) for
 * serverless/edge scalability. Google/Apple OAuth providers are left
 * as a documented follow-up (see the commented block below) — wiring
 * real OAuth client IDs is a product decision (which providers, which
 * markets) outside Phase 3 — Part 1's scope (email/password
 * foundation only).
 *
 * This file must stay edge-compatible (no direct Prisma/Node-only
 * imports at the top level) per NextAuth v5 convention: `auth.config.ts`
 * (providers + callbacks) is imported by middleware, while `auth.ts`
 * (this + PrismaAdapter, if/when added) is the Node-only entry point
 * used by route handlers and server components. AuthService itself
 * runs in the Credentials `authorize()` callback, which NextAuth only
 * ever executes in the Node runtime, not in edge middleware.
 */

import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authService, AuthError } from "@/services/auth.service";

export const authConfig: NextAuthConfig = {
  // NextAuth v5 auto-detects an `AUTH_SECRET` env var by convention,
  // but this project's documented convention (see .env.example and
  // NEXTAUTH_URL in auth.service.ts) is the older NEXTAUTH_-prefixed
  // name — so it must be wired explicitly here, or NextAuth throws
  // "MissingSecret" even when NEXTAUTH_SECRET is set on the host.
  // AUTH_SECRET is also accepted so either naming works.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        try {
          const user = await authService.login(email, password);
          // Shape returned here becomes `user` in the `jwt` callback
          // below on first sign-in.
          return {
            id: user.id,
            email: user.email,
            name: user.displayName,
            role: user.role,
          };
        } catch (err) {
          // NextAuth's Credentials provider expects `null` (not a
          // thrown error) for "these credentials didn't work" — it
          // surfaces as a generic CredentialsSignin error to the
          // client either way, so the AuthError's specific `code`
          // (ACCOUNT_NOT_VERIFIED vs INVALID_CREDENTIALS, etc.) is
          // intentionally not distinguished at this layer. Routes that
          // need the specific reason (e.g. a "resend verification"
          // link) should call authService.login directly instead of
          // going through next-auth's signIn().
          if (err instanceof AuthError) return null;
          throw err;
        }
      },
    }),

    // TODO (post–Phase 3 foundation, product decision needed): Google +
    // Apple OAuth, writing into the OAuthAccount table already present
    // in prisma/schema.prisma. Sketch, once client IDs exist:
    //
    //   Google({
    //     clientId: process.env.GOOGLE_CLIENT_ID,
    //     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    //   }),
    //
    // No schema change needed to add this later — OAuthAccount already
    // models it (see prisma/schema.prisma).
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as typeof session.user & { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
};
