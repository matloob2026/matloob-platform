import { describe, it, expect } from "vitest";
import {
  generateEmailVerificationToken,
  generatePasswordResetToken,
  hashIncomingToken,
  isTokenExpired,
  safeCompareHashes,
} from "@/auth/tokens";

describe("token generation (SHA-256)", () => {
  it("generates a raw token whose hash matches hashIncomingToken", () => {
    const token = generateEmailVerificationToken();
    expect(hashIncomingToken(token.raw)).toBe(token.hash);
  });

  it("produces different raw tokens on each call", () => {
    const a = generateEmailVerificationToken();
    const b = generateEmailVerificationToken();
    expect(a.raw).not.toBe(b.raw);
  });

  it("sets a 1h expiry for password reset tokens and 24h for email verification", () => {
    const reset = generatePasswordResetToken();
    const verify = generateEmailVerificationToken();
    const resetTtlHours = (reset.expiresAt.getTime() - Date.now()) / 3_600_000;
    const verifyTtlHours = (verify.expiresAt.getTime() - Date.now()) / 3_600_000;
    expect(resetTtlHours).toBeCloseTo(1, 1);
    expect(verifyTtlHours).toBeCloseTo(24, 1);
  });

  it("flags a past date as expired", () => {
    expect(isTokenExpired(new Date(Date.now() - 1000))).toBe(true);
    expect(isTokenExpired(new Date(Date.now() + 1000))).toBe(false);
  });

  it("safely compares equal-length hex hashes", () => {
    const token = generateEmailVerificationToken();
    expect(safeCompareHashes(token.hash, token.hash)).toBe(true);
    expect(safeCompareHashes(token.hash, generateEmailVerificationToken().hash)).toBe(false);
  });
});
