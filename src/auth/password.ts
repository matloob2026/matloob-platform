/**
 * Password hashing (argon2id).
 *
 * Per src/auth/README.md: "Passwords: argon2id, never bcrypt-only for
 * new code." This is the only file in the codebase allowed to call
 * `argon2` directly — AuthService and NextAuth's Credentials provider
 * both go through `hashPassword` / `verifyPassword` so the algorithm
 * and its parameters can change in one place later (e.g. tuning cost
 * parameters for new hardware) without touching call sites.
 *
 * Cost parameters below follow OWASP's current argon2id baseline
 * (19 MiB memory, 2 iterations, 1 degree of parallelism) as a sane
 * default for a serverless/edge-adjacent Node runtime. Revisit if
 * profiling shows login latency is an issue.
 */

import * as argon2 from "argon2";

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

/** Minimum acceptable plaintext password length, enforced at the
 * service layer (not here) alongside the rest of the zod input schema. */
export const MIN_PASSWORD_LENGTH = 8;

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return argon2.hash(plainTextPassword, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, plainTextPassword: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainTextPassword);
  } catch {
    // argon2.verify throws on a malformed/foreign hash (e.g. legacy
    // bcrypt hash) rather than returning false — normalize to false so
    // callers never need a try/catch of their own.
    return false;
  }
}

/**
 * True if a stored hash was produced with different parameters than
 * ARGON2_OPTIONS above (i.e. we've since tuned cost parameters). Callers
 * (AuthService.login) can use this to opportunistically re-hash and
 * persist a fresh hash on successful login, without forcing a mass
 * migration or forcing users to reset their password.
 */
export function needsRehash(hash: string): boolean {
  return argon2.needsRehash(hash, ARGON2_OPTIONS);
}
