/**
 * MediaService integration tests — focused on ownership enforcement
 * and validation, which reject BEFORE any call to Cloudinary. Actually
 * uploading an image requires live CLOUDINARY_* credentials, which
 * this sandbox (and most CI environments) won't have configured — so,
 * consistent with how tests/integration/auth-flow.e2e.test.ts and
 * request-flow.e2e.test.ts already handle "needs a real external
 * dependency", this file sticks to what's verifiable with just a
 * database: ownership checks and input validation. Same
 * skip-without-DATABASE_URL pattern as those two files.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { MediaService as MediaServiceType, MediaServiceError } from "@/services/media.service";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("MediaService — ownership and validation (live database)", () => {
  let prisma: PrismaClient;
  let mediaService: MediaServiceType;

  const ownerEmail = `phase3-media-owner-${Date.now()}@matloob.test`;
  const strangerEmail = `phase3-media-stranger-${Date.now()}@matloob.test`;
  let ownerId: string;
  let strangerId: string;
  let requestId: string;

  beforeAll(async () => {
    const { PrismaClient } = await import("@prisma/client");
    const { MediaService } = await import("@/services/media.service");
    prisma = new PrismaClient();
    mediaService = new MediaService();

    const owner = await prisma.user.create({ data: { email: ownerEmail, status: "ACTIVE" } });
    const stranger = await prisma.user.create({ data: { email: strangerEmail, status: "ACTIVE" } });
    ownerId = owner.id;
    strangerId = stranger.id;

    const category =
      (await prisma.category.findFirst()) ??
      (await prisma.category.create({ data: { slug: `phase3-media-test-${Date.now()}` } }));
    const country =
      (await prisma.country.findFirst()) ??
      (await prisma.country.create({ data: { code: "SA", isActive: true, isDefault: true } }));

    const request = await prisma.request.create({
      data: {
        ownerId,
        categoryId: category.id,
        countryId: country.id,
        title: "طلب لاختبار الوسائط",
        description: "طلب تجريبي للتحقق من صلاحيات إدارة الصور.",
        status: "PUBLISHED",
      },
    });
    requestId = request.id;
  });

  afterAll(async () => {
    await prisma.request.deleteMany({ where: { ownerId: { in: [ownerId, strangerId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, strangerId] } } });
    await prisma.$disconnect();
  });

  it("rejects a disallowed mime type before ever contacting Cloudinary", async () => {
    await expect(
      mediaService.addRequestImage(requestId, ownerId, {
        buffer: Buffer.from("not an image"),
        size: 10,
        type: "application/pdf",
      })
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" } satisfies Partial<MediaServiceError>);
  });

  it("rejects a file over the size limit before ever contacting Cloudinary", async () => {
    await expect(
      mediaService.addRequestImage(requestId, ownerId, {
        buffer: Buffer.alloc(1),
        size: 10 * 1024 * 1024, // 10MB > 5MB limit
        type: "image/png",
      })
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" } satisfies Partial<MediaServiceError>);
  });

  it("refuses to let a different user add images to someone else's request", async () => {
    await expect(
      mediaService.addRequestImage(requestId, strangerId, {
        buffer: Buffer.alloc(1),
        size: 1,
        type: "image/png",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" } satisfies Partial<MediaServiceError>);
  });

  it("refuses to let a different user reorder someone else's request images", async () => {
    await expect(
      mediaService.reorderRequestImages(requestId, strangerId, ["fake-id"])
    ).rejects.toMatchObject({ code: "NOT_FOUND" } satisfies Partial<MediaServiceError>);
  });

  it("rejects a reorder list that doesn't match the request's current images", async () => {
    await expect(
      mediaService.reorderRequestImages(requestId, ownerId, ["not-a-real-media-id"])
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" } satisfies Partial<MediaServiceError>);
  });

  it("returns NOT_FOUND when deleting an image that doesn't exist", async () => {
    await expect(mediaService.deleteImage("not-a-real-id", ownerId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    } satisfies Partial<MediaServiceError>);
  });
});

describe.skipIf(hasDatabase)("MediaService — ownership and validation (skipped)", () => {
  it("is skipped because DATABASE_URL is not set — see file header", () => {
    expect(hasDatabase).toBe(false);
  });
});
