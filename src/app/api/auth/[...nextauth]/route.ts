/**
 * NextAuth's own catch-all route — handles /api/auth/signin,
 * /api/auth/callback/credentials, /api/auth/session, /api/auth/signout,
 * etc. Do not add custom logic here; this must stay a thin re-export so
 * NextAuth's internal routing keeps working.
 *
 * Matloob's own custom auth endpoints (register, verify-email,
 * forgot-password, reset-password) intentionally live as SIBLING routes
 * (src/app/api/auth/register, etc.), not inside this catch-all, since
 * they are Matloob-specific flows NextAuth has no opinion about.
 */

import { handlers } from "@/auth/auth";

export const { GET, POST } = handlers;
