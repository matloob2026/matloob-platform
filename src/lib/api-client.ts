/**
 * Uniform client-side fetch wrapper. Every component/hook that calls
 * our own /api routes goes through this, never raw `fetch`, so that:
 *   - ApiError shape (src/types/domain.ts) is handled in exactly one place
 *   - auth headers / locale headers are attached consistently
 *   - retry/backoff policy can be added later without touching call sites
 */

import type { ApiError } from "@/types/domain";

export class ApiRequestError extends Error {
  constructor(public readonly error: ApiError, public readonly status: number) {
    super(error.message);
  }
}

interface RequestOptions extends RequestInit {
  locale?: string;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { locale, headers, ...rest } = options;

  const res = await fetch(path, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(locale ? { "Accept-Language": locale } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: ApiError } | null;
    const error: ApiError = body?.error ?? {
      code: "UNKNOWN_ERROR",
      message: "Something went wrong. Please try again.",
    };
    throw new ApiRequestError(error, res.status);
  }

  return res.json() as Promise<T>;
}
