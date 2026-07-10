/**
 * Node-runtime NextAuth entry point. Route handlers, server components,
 * and server actions import `auth`, `signIn`, `signOut` from here —
 * never construct NextAuth() a second time elsewhere in the codebase.
 *
 * (middleware, if/when Matloob adds route-matching middleware, should
 * import `authConfig` directly from ./auth.config to stay edge-safe —
 * see the docstring in that file.)
 */

import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
