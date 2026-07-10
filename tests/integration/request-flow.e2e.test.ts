/**
 * End-to-end Request Management tests — create, edit, delete, status
 * transitions, and ownership enforcement — run against a REAL Postgres
 * database via Prisma.
 *
 * Same sandbox limitation as tests/integration/auth-flow.e2e.test.ts:
 * this suite auto-skips when DATABASE_URL isn't set (as in this
 * sandbox) and is written and ready to run for real once
 * `prisma generate` + `prisma migrate deploy` succeed elsewhere. See
 * DEPLOYMENT.md.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { RequestService as RequestServiceType, RequestServiceError } from "@/services/request.service";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("RequestService — live database end-to-end", () => {
  let prisma: PrismaClient;
  let requestService: RequestServiceType;

  const ownerEmail = `phase3-part2-owner-${Date.now()}@matloob.test`;
  const strangerEmail = `phase3-part2-stranger-${Date.now()}@matloob.test`;
  let ownerId: string;
  let strangerId: string;
  let categoryId: string;
  let countryId: string;
  let createdRequestId: string;

  beforeAll(async () => {
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaRequestService } = await import("@/services/request.service");
    prisma = new PrismaClient();
    requestService = new PrismaRequestService();

    // Minimal fixtures: two users (owner + a stranger, to prove
    // ownership enforcement) and one category/country to attach the
    // request to. Bypasses AuthService on purpose — RequestService
    // only cares about a valid ownerId, not credential/verification
    // state, so this stays a focused fixture rather than duplicating
    // the auth end-to-end suite.
    const owner = await prisma.user.create({ data: { email: ownerEmail, status: "ACTIVE" } });
    const stranger = await prisma.user.create({ data: { email: strangerEmail, status: "ACTIVE" } });
    ownerId = owner.id;
    strangerId = stranger.id;

    const category =
      (await prisma.category.findFirst()) ??
      (await prisma.category.create({ data: { slug: `phase3-test-${Date.now()}` } }));
    categoryId = category.id;

    const country =
      (await prisma.country.findFirst()) ??
      (await prisma.country.create({ data: { code: "SA", isActive: true, isDefault: true } }));
    countryId = country.id;
  });

  afterAll(async () => {
    await prisma.request.deleteMany({ where: { ownerId: { in: [ownerId, strangerId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, strangerId] } } });
    await prisma.$disconnect();
  });

  it("creates a request associated with the authenticated owner, published immediately", async () => {
    const created = await requestService.create({
      ownerId,
      categoryId,
      countryId,
      title: "أحتاج مصمم داخلي لشقة",
      description: "أبحث عن مصمم داخلي محترف لتصميم شقة جديدة في الرياض خلال شهر.",
    });

    createdRequestId = created.id;
    expect(created.owner.id).toBe(ownerId);
    expect(created.status).toBe("PUBLISHED");
    expect(created.publishedAt).toBeTruthy();
  });

  it("retrieves the request by id with full detail", async () => {
    const found = await requestService.getById(createdRequestId);
    expect(found).not.toBeNull();
    expect(found?.owner.id).toBe(ownerId);
  });

  it("lets the owner edit their own request", async () => {
    const updated = await requestService.update(createdRequestId, ownerId, {
      title: "أحتاج مصمم داخلي لشقة (محدث)",
      budgetMin: 5000,
      budgetMax: 8000,
    });
    expect(updated.title).toBe("أحتاج مصمم داخلي لشقة (محدث)");
    expect(updated.budgetMin).toBe(5000);
    expect(updated.budgetMax).toBe(8000);
  });

  it("refuses to let a different user edit the request (ownership enforcement)", async () => {
    await expect(
      requestService.update(createdRequestId, strangerId, { title: "محاولة تعديل" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" } satisfies Partial<RequestServiceError>);
  });

  it("refuses to let a different user delete the request", async () => {
    await expect(requestService.remove(createdRequestId, strangerId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    } satisfies Partial<RequestServiceError>);
  });

  it("rejects publishing a request that isn't a draft", async () => {
    await expect(requestService.publish(createdRequestId, ownerId)).rejects.toMatchObject({
      code: "INVALID_STATUS_TRANSITION",
    } satisfies Partial<RequestServiceError>);
  });

  it("lets the owner close their published request", async () => {
    await requestService.close(createdRequestId, ownerId);
    const found = await requestService.getById(createdRequestId);
    expect(found?.status).toBe("CLOSED_BY_BUYER");
  });

  it("rejects closing an already-closed request", async () => {
    await expect(requestService.close(createdRequestId, ownerId)).rejects.toMatchObject({
      code: "INVALID_STATUS_TRANSITION",
    } satisfies Partial<RequestServiceError>);
  });

  it("rejects editing a closed request", async () => {
    await expect(
      requestService.update(createdRequestId, ownerId, { title: "بعد الإغلاق" })
    ).rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION" } satisfies Partial<RequestServiceError>);
  });

  it("lists the request under the owner's My Requests, regardless of status", async () => {
    const mine = await requestService.listMine(ownerId);
    expect(mine.items.some((r) => r.id === createdRequestId)).toBe(true);
  });

  it("soft-deletes the request so it disappears from every read path", async () => {
    await requestService.remove(createdRequestId, ownerId);

    expect(await requestService.getById(createdRequestId)).toBeNull();

    const mine = await requestService.listMine(ownerId);
    expect(mine.items.some((r) => r.id === createdRequestId)).toBe(false);

    const dbRow = await prisma.request.findUnique({ where: { id: createdRequestId } });
    expect(dbRow?.deletedAt).not.toBeNull(); // still present in the DB, just soft-deleted
  });

  it("creates a draft request when publishImmediately is false, and can publish it later", async () => {
    const draft = await requestService.create({
      ownerId,
      categoryId,
      countryId,
      title: "طلب مسودة للاختبار",
      description: "هذا طلب تجريبي محفوظ كمسودة قبل النشر الفعلي على المنصة.",
      publishImmediately: false,
    });
    expect(draft.status).toBe("DRAFT");

    const published = await requestService.publish(draft.id, ownerId);
    expect(published.status).toBe("PUBLISHED");

    await requestService.remove(draft.id, ownerId); // cleanup
  });
});

describe.skipIf(hasDatabase)("RequestService — live database end-to-end (skipped)", () => {
  it("is skipped because DATABASE_URL is not set — see file header for the commands to enable it", () => {
    expect(hasDatabase).toBe(false);
  });
});
