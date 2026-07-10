/**
 * One-time token helpers for email verification and password reset.
 *
 * Pattern (same rationale as Session.tokenHash in prisma/schema.prisma):
 * we generate a high-entropy random token, send the RAW token to the
 * user (in the verification/reset link), and store only its SHA-256
 * hash in the database. A database leak or read-replica compromise
 * then never hands out usable tokens — the attacker would need the
 * raw value, which only ever existed in the outbound email and the
 * user's browser.
 *
 * SHA-256 (not argon2) is intentional here: these tokens are already
 * high-entropy random values (not low-entropy human-chosen secrets),
 * so a fast deterministic hash is correct — argon2's slow, memory-hard
 * design is for defending weak/guessable secrets like passwords, and
 * would add needless latency to every verification link click.
 */

import { randomBytes, createHash, timingSafeEqual } from "crypto";

const TOKEN_BYTES = 32; // 256 bits of entropy
export const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

export interface GeneratedToken {
  /** Raw token — goes in the outbound email link, never persisted. */
  raw: string;
  /** SHA-256 hex digest of `raw` — this is what gets stored in the DB. */
  hash: string;
  /** Convenience expiry timestamp for the given TTL. */
  expiresAt: Date;
}

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function generateToken(ttlMs: number): GeneratedToken {
  const raw = randomBytes(TOKEN_BYTES).toString("base64url");
  return {
    raw,
    hash: hashToken(raw),
    expiresAt: new Date(Date.now() + ttlMs),
  };
}

export function generateEmailVerificationToken(): GeneratedToken {
  return generateToken(EMAIL_VERIFICATION_TOKEN_TTL_MS);
}

export function generatePasswordResetToken(): GeneratedToken {
  return generateToken(PASSWORD_RESET_TOKEN_TTL_MS);
}

/**
 * Hash a raw token received from the client (query param / form body) so
 * it can be looked up against the stored `tokenHash` column. Callers
 * should look the hash up via a plain equality match in Prisma
 * (`where: { tokenHash } `) — the DB index does the safe part, this
 * function just needs to be deterministic, which SHA-256 already is.
 */
export function hashIncomingToken(rawToken: string): string {
  return hashToken(rawToken);
}

/**
 * Constant-time comparison, used only in the rare case a hash is
 * compared in application code rather than filtered in the DB query
 * (e.g. comparing against a value already fetched for other reasons).
 * Prevents timing side-channels on the comparison itself.
 */
export function safeCompareHashes(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function isTokenExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() < Date.now();
}
