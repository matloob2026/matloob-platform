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
  notify(input: NotifyInput): Promise<void>;
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
export class PrismaNotificationService implements NotificationService {
  async notify(input: NotifyInput): Promise<void> {
    const channels = input.channels ?? ["IN_APP"];
    await prisma.notification.createMany({
      data: channels.map((channel) => ({
        userId: input.userId,
        type: input.type,
        channel,
        title: input.title,
        body: input.body,
        linkUrl: input.linkUrl ?? null,
        metadata: input.metadata ?? undefined,
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
