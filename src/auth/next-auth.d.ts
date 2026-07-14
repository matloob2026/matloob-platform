/**
 * Module augmentation for NextAuth's Session/JWT types, adding the two
 * custom fields this project attaches in src/auth/auth.config.ts's
 * `jwt`/`session` callbacks: `id` and `role`. This is the officially
 * documented Auth.js v5 pattern for typing custom session data (see
 * https://authjs.dev/getting-started/typescript) — it replaces the
 * inline `as` casts that were previously needed at every read site.
 *
 * Type-only file: no runtime behavior changes.
 */
import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/types/domain";

declare module "next-auth" {
  interface User {
    role?: UserRole;
  }
  interface Session {
    user: {
      id: string;
      role?: UserRole;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
  }
}
