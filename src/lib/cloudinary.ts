/**
 * Cloudinary integration — signed, server-side only.
 *
 * Deliberately NOT using unsigned/client-direct-to-Cloudinary uploads:
 * every upload is signed by this server using CLOUDINARY_API_SECRET,
 * which never leaves the server, and every upload request must first
 * pass through one of our own authenticated API routes (see
 * src/app/api/media/**). This is the "secure uploads / prevent
 * unauthorized uploads" requirement — an attacker can't upload
 * directly to our Cloudinary account without going through our own
 * auth + ownership checks first.
 *
 * Uses fetch + Node's crypto directly rather than the `cloudinary` npm
 * SDK, matching this codebase's existing preference for small,
 * dependency-free provider integrations (see ResendMailer).
 */

import { createHash } from "crypto";

export class CloudinaryError extends Error {}

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

function getConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new CloudinaryError(
      "Cloudinary is not configured — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  return { cloudName, apiKey, apiSecret };
}

/** True without throwing — lets routes return a clean 503 instead of a stack trace. */
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Cloudinary's signature scheme: sort all params-to-sign alphabetically
 * by key, join as `key=value&key=value`, append the API secret (no
 * separator), then SHA-1 the whole string. See Cloudinary's own docs
 * ("Generating authentication signatures").
 */
function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}

export interface UploadedImage {
  url: string;
  publicId: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  format: string | null;
}

/**
 * Upload a single image buffer to Cloudinary under a given folder
 * (e.g. "matloob/requests/<requestId>" or "matloob/avatars/<userId>").
 * `f_auto,q_auto` equivalents are applied at DELIVERY time (see
 * buildResponsiveUrl below), not at upload time — the source is stored
 * as uploaded and Cloudinary derives optimized variants on the fly.
 */
export async function uploadImage(
  fileBuffer: Buffer,
  options: { folder: string; publicId?: string }
): Promise<UploadedImage> {
  const { cloudName, apiKey, apiSecret } = getConfig();

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign: Record<string, string | number> = {
    folder: options.folder,
    timestamp,
    ...(options.publicId ? { public_id: options.publicId } : {}),
  };
  const signature = signParams(paramsToSign, apiSecret);

  const form = new FormData();
  form.set("file", new Blob([new Uint8Array(fileBuffer)]));
  form.set("api_key", apiKey);
  form.set("timestamp", String(timestamp));
  form.set("folder", options.folder);
  if (options.publicId) form.set("public_id", options.publicId);
  form.set("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(`Cloudinary upload failed (${response.status})`, body);
    throw new CloudinaryError("Image upload failed. Please try again.");
  }

  const data = (await response.json()) as {
    secure_url: string;
    public_id: string;
    width?: number;
    height?: number;
    bytes?: number;
    format?: string;
  };

  return {
    url: data.secure_url,
    publicId: data.public_id,
    width: data.width ?? null,
    height: data.height ?? null,
    bytes: data.bytes ?? null,
    format: data.format ?? null,
  };
}

/** Deletes the remote asset. Safe to call even if it's already gone —
 * Cloudinary's destroy API returns `{ result: "not found" }` rather
 * than an error in that case, which this treats as success. */
export async function destroyImage(publicId: string): Promise<void> {
  const { cloudName, apiKey, apiSecret } = getConfig();

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams({ public_id: publicId, timestamp }, apiSecret);

  const form = new FormData();
  form.set("public_id", publicId);
  form.set("api_key", apiKey);
  form.set("timestamp", String(timestamp));
  form.set("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(`Cloudinary destroy failed (${response.status})`, body);
    throw new CloudinaryError("Failed to delete the image from storage.");
  }
}

export { buildResponsiveUrl } from "./cloudinary-url";
