import { describe, it, expect } from "vitest";
import { buildResponsiveUrl } from "@/lib/cloudinary-url";

describe("buildResponsiveUrl", () => {
  it("inserts an f_auto,q_auto,w_<width> transformation after /upload/", () => {
    const original = "https://res.cloudinary.com/demo/image/upload/v1234/matloob/requests/abc/photo.jpg";
    const result = buildResponsiveUrl(original, 240);
    expect(result).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_240/v1234/matloob/requests/abc/photo.jpg"
    );
  });

  it("returns the original URL unchanged if it isn't a Cloudinary delivery URL", () => {
    const original = "https://example.com/not-cloudinary.jpg";
    expect(buildResponsiveUrl(original, 240)).toBe(original);
  });
});
