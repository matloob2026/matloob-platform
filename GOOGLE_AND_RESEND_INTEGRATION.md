# Authentication Completion — Google Login + Resend integration guide

## What was implemented
- **Google Login**: real NextAuth Google provider (`src/auth/auth.config.ts`), account creation/linking via a new `AuthService.loginWithGoogle` method, using the existing `OAuthAccount` table — no schema change. The existing Google button UI (previously a disabled placeholder) is now fully functional; Apple stays a disabled placeholder as before.
- **Resend integration**: new `ResendMailer` (`src/lib/mailer/resend.mailer.ts`), calling Resend's REST API directly. Selected automatically instead of the dev-only `ConsoleMailer` once its env vars are set — no other file needs to change. New clean, Arabic, RTL HTML+text email templates (`src/lib/mailer/templates.ts`) used by both verification and password-reset emails.
- Verified (in this sandbox): `tsc`, `eslint`, all unit/integration tests, `next build`'s compile+type-check phase — all clean. Also re-validated the schema against a real local PostgreSQL instance, including simulating the exact new-user and existing-user Google linking paths and the uniqueness constraint that prevents double-linking a Google account.

## Environment variables to add in Vercel

### Google OAuth (both required together)
| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |

**Setup steps on Google's side:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create an OAuth 2.0 Client ID, type **Web application**.
3. Add this Authorized redirect URI (exact match, including the path):
   ```
   https://<your-vercel-domain>/api/auth/callback/google
   ```
4. Copy the generated Client ID/Secret into Vercel's env vars above.

If these two vars are left unset, the Google provider simply isn't registered — the button still renders (per "keep the existing UI") but clicking it will show NextAuth's normal "provider not configured" error rather than crashing the app.

### Resend (both required together)
| Variable | Value |
|---|---|
| `RESEND_API_KEY` | From your Resend dashboard |
| `RESEND_FROM_EMAIL` | e.g. `Matloob <noreply@yourdomain.com>` — must be on a domain verified with Resend |

If these are left unset, the app falls back to `ConsoleMailer` (emails are logged, not sent — same as before this change).

## Nothing else needs to change in Vercel
`DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` (or `AUTH_SECRET`) — already required and already documented in `DEPLOYMENT.md`; unaffected by this feature.

## Verifying after you add these
1. Redeploy (or just save the env vars + redeploy) so the build picks them up.
2. `/register` → check the email arrives via Resend with the new HTML template → click the link → `/verify-email` succeeds.
3. `/login` with that account.
4. `/forgot-password` → check the reset email arrives → `/reset-password` with the token.
5. `/login` (or `/register`) → click "المتابعة عبر Google" → complete Google's consent screen → should land on `/my-requests`, signed in.
6. Sign in with Google again using the same Google account → should sign in directly (no duplicate account created) — this is exactly what the linking logic verified above guarantees.

No business logic, database schema, or unrelated pages were changed — only the auth provider config, the new `loginWithGoogle`/`getAuthenticatedUserByEmail`/`resendVerificationEmail`-adjacent additions to `AuthService`, the mailer swap-point, and the email templates.
