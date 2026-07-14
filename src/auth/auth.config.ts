/**
 * NextAuth.js (Auth.js) v5 configuration.
 *
 * Per src/auth/README.md: Credentials provider backed by `passwordHash`
 * on `User`, JWT session strategy (not DB sessions) for
 * serverless/edge scalability. Google OAuth is implemented below,
 * registered only when GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are set.
 * Apple OAuth remains a documented follow-up (see the TODO in the
 * providers array) — a product decision (which markets) outside this
 * feature's scope.
 *
 * No PrismaAdapter is used: this project's schema uses its own
 * `OAuthAccount`/`Session`/`EmailVerificationToken` models (different
 * shape than NextAuth's official adapter schema), so account
 * linking for Google is done manually in the `signIn`/`jwt` callbacks
 * via `AuthService.loginWithGoogle`, not an adapter. This is a
 * standard, documented NextAuth pattern for JWT-strategy + custom
 * schemas.
 *
 * This file must stay edge-compatible (no direct Prisma/Node-only
 * imports at the top level) per NextAuth v5 convention: `auth.config.ts`
 * (providers + callbacks) is imported by middleware, while `auth.ts`
 * (this + PrismaAdapter, if/when added) is the Node-only entry point
 * used by route handlers and server components. AuthService itself
 * runs in the Credentials `authorize()` callback and the Google
 * `signIn`/`jwt` callbacks, which NextAuth only ever executes in the
 * Node runtime, not in edge middleware.
 */

import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authService, AuthError } from "@/services/auth.service";

export const authConfig: NextAuthConfig = {
  // Vercel deployments can have multiple valid hostnames (production
  // domain, preview URLs, etc.), and the actual request's Host header
  // is the only reliable source for "where are we actually running
  // right now" — NOT a static NEXTAUTH_URL/AUTH_URL env var, which is
  // easy to leave pointing at an old deployment. Without this,
  // NextAuth computes its own internal base URL for the *final*
  // post-Google-consent redirect from that static env var instead of
  // the request that's actually happening, which is exactly how the
  // Google OAuth flow can successfully reach Google and come back, but
  // then redirect the browser to a deployment that no longer exists
  // (DEPLOYMENT_NOT_FOUND). This does not affect the Credentials
  // provider or any application redirect logic — only which host
  // NextAuth itself trusts when building its own redirect target.
  trustHost: true,
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

    // Only registered when both env vars are present, so a deploy
    // without Google OAuth configured yet doesn't crash NextAuth at
    // startup — the UI's Google button (OAuthPlaceholders.tsx) is
    // always rendered, but this provider silently doesn't exist server
    // side until GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are set.
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    // TODO (future, product decision needed): Apple OAuth. Same
    // pattern as Google above — OAuthAccount already models it, no
    // schema change needed when this is added.
  ],
  callbacks: {
    /**
     * For Google sign-in, resolve (or create) the internal User via
     * AuthService — this is the OAuth equivalent of the Credentials
     * provider's authorize() above. Runs before `jwt`.
     */
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        try {
          await authService.loginWithGoogle({
            email: user.email,
            providerAccountId: account.providerAccountId,
            displayName: user.name ?? undefined,
          });
        } catch (err) {
          if (err instanceof AuthError) return false;
          throw err;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && user?.email) {
        // signIn() above already created/linked the account — just
        // look up the resolved internal user so the token carries OUR
        // id/role, not Google's own `sub`.
        const resolved = await authService.getAuthenticatedUserByEmail(user.email);
        if (resolved) {
          token.id = resolved.id;
          token.role = resolved.role;
        }
        return token;
      }

      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.role = token.role;
      }
      return session;
    },
  },
};
