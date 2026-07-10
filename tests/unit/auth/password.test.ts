import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, needsRehash } from "@/auth/password";

describe("password hashing (argon2id)", () => {
  it("hashes and verifies a correct password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(hash, "correct-horse-battery-staple")).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword(hash, "wrong-password")).toBe(false);
  });

  it("does not throw on a malformed hash", async () => {
    expect(await verifyPassword("not-a-real-hash", "anything")).toBe(false);
  });

  it("does not flag a freshly-created hash as needing rehash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(needsRehash(hash)).toBe(false);
  });
});
