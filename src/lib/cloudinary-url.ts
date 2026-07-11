/**
 * Builds a responsive, auto-optimized delivery URL from a Cloudinary
 * secure_url by inserting an `f_auto,q_auto,w_<width>` transformation
 * segment — this is what gives "automatic compression" (q_auto) and
 * "responsive image delivery" (w_<width> + f_auto picks the best
 * format per browser), without needing multiple stored copies.
 *
 * Kept in its own file (no `crypto`/Node-only imports, unlike
 * cloudinary.ts) specifically so client components can import it
 * directly for `<img>` previews without pulling Node-only code into
 * the browser bundle.
 */
export function buildResponsiveUrl(originalUrl: string, width: number): string {
  const marker = "/upload/";
  const idx = originalUrl.indexOf(marker);
  if (idx === -1) return originalUrl; // not a Cloudinary URL (e.g. in tests) — return as-is
  const before = originalUrl.slice(0, idx + marker.length);
  const after = originalUrl.slice(idx + marker.length);
  return `${before}f_auto,q_auto,w_${width}/${after}`;
}
