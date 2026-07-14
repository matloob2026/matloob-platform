# Diagnostic: Verification Email Never Reaching Resend

## Root cause

`src/lib/mailer/index.ts`'s `createMailer()` selects `ResendMailer`
only when **both** `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set:

```ts
if (apiKey && fromEmail) {
  return new ResendMailer(apiKey, fromEmail);
}
return new ConsoleMailer();
```

This fallback to `ConsoleMailer` was **completely silent** — no log,
no warning, nothing. `ConsoleMailer.send()` always resolves
successfully (it just writes the email to the server log instead of
sending it), so from the outside, registration looks 100% successful:
the API returns 201, the frontend shows "Check your email" — but
Resend's real API is never called at all.

That exactly matches what you reported: **registration succeeds, but
Resend's Total Uses stays at 0.** Since you mentioned replacing
`RESEND_API_KEY` specifically, the most likely scenario is that
`RESEND_FROM_EMAIL` was never added to Vercel (or was added with a
typo/wrong name) — with only one of the two variables present, the
condition above is false, and the app silently fell back to
`ConsoleMailer` even with a perfectly valid API key sitting unused.

## Trace of the flow (confirmed correct, not the bug)
1. `POST /api/auth/register` → `AuthService.register()` — creates the
   user + profile, no conditional skip before calling
   `sendVerificationEmail`.
2. `AuthService.sendVerificationEmail()` — creates the token, then
   unconditionally `await`s `this.mailerImpl.send(...)` — no swallowed
   exception, no early return.
3. `this.mailerImpl` is whichever `Mailer` `src/lib/mailer/index.ts`
   selected **at module load time** — this is where the bug lives, not
   in steps 1–2 or in `ResendMailer.send()` itself (which correctly
   calls Resend's REST API and throws on a non-2xx response — that
   part was never reached).

## Fix applied
`src/lib/mailer/index.ts`: the fallback to `ConsoleMailer` now always
logs a clear, specific error naming exactly which variable is missing:

```ts
console.error(
  "[mailer] Falling back to ConsoleMailer — emails will NOT be sent for real.",
  !apiKey && !fromEmail
    ? "Both RESEND_API_KEY and RESEND_FROM_EMAIL are missing."
    : !apiKey
      ? "RESEND_API_KEY is missing."
      : "RESEND_FROM_EMAIL is missing."
);
```

This doesn't change the fallback behavior itself (still falls back to
`ConsoleMailer` in dev/CI with no credentials, as intended) — it just
makes a production misconfiguration immediately visible in Vercel's
function logs instead of silently indistinguishable from success.

**No other bug was found.** The registration → token → mailer call
chain has no conditional returns before sending and no swallowed
exceptions elsewhere.

## What you should check on Vercel right now
Go to your Vercel project → Settings → Environment Variables and
confirm **both** of these are present, for the **Production**
environment specifically (not just Preview/Development):
- `RESEND_API_KEY` — the new key
- `RESEND_FROM_EMAIL` — e.g. `Matloob <noreply@yourdomain.com>`, and
  that domain must be verified in your Resend account, or Resend will
  reject the send even once this variable is set.

After confirming both and redeploying, register a test account — if
`RESEND_FROM_EMAIL` was the missing piece, Resend's Total Uses should
now increase, and if anything is still wrong (e.g. an unverified
sending domain), Vercel's function logs will now show a specific
`[ResendMailer] send failed (<status>)` line with Resend's own error
body, rather than silence.

## Debug logs
Temporary step-by-step trace logs (user created / token created /
entering the mailer / calling Resend / success / failure) were added
and used to walk the flow during this diagnostic, then removed per
your instructions once the root cause was identified in the mailer
selection logic — they weren't needed to demonstrate the fix, since
the bug is a static configuration-branch issue, not something that
only appears at a specific runtime step. The one log that **was**
kept is the permanent misconfiguration warning above, which directly
prevents this exact failure mode from ever being silent again.

## Verification performed
- `tsc --noEmit`, `eslint .`: clean (one pre-existing, unrelated warning)
- All tests passing
- `next build`: compiles and type-checks cleanly; fails only at the
  same pre-existing page-data-collection step needing a real generated
  Prisma client (this sandbox's long-standing, unrelated network
  restriction to `binaries.prisma.sh` — not affected by this fix)
- `prisma generate` / `prisma migrate deploy`: still blocked only by
  that same sandbox restriction, unchanged; both run normally on
  Vercel
