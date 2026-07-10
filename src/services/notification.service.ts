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
 * TODO (Phase 2): implement fan-out per channel behind a queue
 * (see docs/ARCHITECTURE.md "Background Jobs" section) so a slow email
 * provider never blocks the request that triggered the notification.
 */
export class PrismaNotificationService implements NotificationService {
  async notify(_input: NotifyInput): Promise<void> {
    throw new Error("Not yet implemented — Phase 1 is architecture only.");
  }
  async listForUser(_userId: string, _unreadOnly?: boolean): Promise<NotificationItem[]> {
    throw new Error("Not yet implemented — Phase 1 is architecture only.");
  }
  async markRead(_notificationId: string, _userId: string): Promise<void> {
    throw new Error("Not yet implemented — Phase 1 is architecture only.");
  }
}
