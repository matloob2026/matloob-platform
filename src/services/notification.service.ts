/**
 * NotificationService
 * ===================
 * Single entry point for creating notifications, regardless of which
 * channel they'll ultimately be delivered through (in-app, email, SMS,
 * push). Other services (OfferService, RequestService) call `notify()`
 * — they never write to the Notification table directly and never call
 * an email/SMS provider directly either.
 *
 * This indirection is what lets us swap the email provider or add a
 * push provider later by changing one file, and is also the hook point
 * for the future AI layer (src/ai/notifications) to trigger
 * AI_SUGGESTION notifications without touching this contract.
 */

import type { NotificationItem } from "@/types/domain";
import { prisma } from "@/lib/prisma";
import type { InputJsonValue } from "@prisma/client/runtime/library";
import type { Prisma } from "@prisma/client";

/** Workflow Integration phase: `notify()` accepts either the global
 * `prisma` client or a `Prisma.TransactionClient` — item 9 requires
 * every workflow action (offer accept, request close, new message,
 * etc.) to write its notifications atomically alongside the rest of
 * that action's writes, not as a separate call after the transaction
 * has already committed. Defaults to the global client so every
 * existing, non-transactional caller keeps working unchanged. */
export type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export type NotificationType =
  | "NEW_OFFER"
  | "OFFER_ACCEPTED"
  | "OFFER_REJECTED"
  | "NEW_MESSAGE"
  | "REQUEST_EXPIRING"
  | "REQUEST_APPROVED"
  | "REQUEST_REJECTED"
  | "SYSTEM_ANNOUNCEMENT"
  | "AI_SUGGESTION";

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
  /** Defaults to ["IN_APP"]; pass additional channels explicitly. */
  channels?: Array<"IN_APP" | "EMAIL" | "SMS" | "PUSH">;
}

export interface NotificationService {
  notify(input: NotifyInput, client?: PrismaClientOrTx): Promise<void>;
  listForUser(userId: string, unreadOnly?: boolean): Promise<NotificationItem[]>;
  markRead(notificationId: string, userId: string): Promise<void>;
}

/**
 * Implements the `NotificationService` contract declared above (was a
 * Phase 1 stub that threw "Not yet implemented" on every method) — the
 * SAME class, finished, not a second/parallel notification system.
 * Reused as-is by the Requests Admin Module (see
 * src/services/admin/request-admin.service.ts) for "notify the
 * request owner whenever an admin changes a request's status."
 */
/**
 * Converts the intentionally loose `NotifyInput.metadata` (a plain,
 * caller-supplied payload — request/offer ids, strings, numbers;
 * never functions, symbols, or class instances) into the strict
 * `Prisma.InputJsonValue` shape `prisma.notification.createMany()`
 * requires for the `metadata Json?` column.
 *
 * `Record<string, unknown>` is not structurally assignable to
 * `InputJsonValue` — TypeScript can't prove every `unknown` value in
 * an arbitrary record is JSON-serializable, even though every actual
 * caller of `notify()` in this codebase only ever passes plain
 * JSON-safe objects. This is that one, single, documented conversion
 * point rather than a scattered or blanket `any`.
 *
 * Imports `InputJsonValue` from `@prisma/client/runtime/library`
 * rather than via `Prisma.InputJsonValue` — it's the exact same type
 * either way (a generated client's `Prisma` namespace re-exports this
 * type from that same runtime module), but importing it directly from
 * its stable source doesn't depend on that namespace re-export
 * actually being present, which makes this resilient across
 * generation states.
 */
function toInputJson(metadata: Record<string, unknown> | undefined): InputJsonValue | undefined {
  if (metadata === undefined) return undefined;
  return metadata as InputJsonValue;
}

export class PrismaNotificationService implements NotificationService {
  async notify(input: NotifyInput, client: PrismaClientOrTx = prisma): Promise<void> {
    const channels = input.channels ?? ["IN_APP"];
    const metadata = toInputJson(input.metadata);
    await client.notification.createMany({
      data: channels.map((channel) => ({
        userId: input.userId,
        type: input.type,
        channel,
        title: input.title,
        body: input.body,
        linkUrl: input.linkUrl ?? null,
        metadata,
      })),
    });
  }

  async listForUser(userId: string, unreadOnly?: boolean): Promise<NotificationItem[]> {
    const rows = await prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(
      (r: {
        id: string;
        type: string;
        title: string;
        body: string;
        linkUrl: string | null;
        isRead: boolean;
        createdAt: Date;
      }) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        body: r.body,
        linkUrl: r.linkUrl ?? undefined,
        isRead: r.isRead,
        createdAt: r.createdAt.toISOString(),
      })
    );
  }

  async markRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }
}

export const notificationService = new PrismaNotificationService();
