/**
 * ConversationService
 * ===================
 * Workflow Integration phase: the messaging layer that OfferService's
 * `accept()` already opens a Conversation for (buyer <-> supplier,
 * `Conversation.offerId` unique to that one offer). This service is
 * what actually lets the two parties read and send messages in it —
 * OfferService only creates the room and its first system message; it
 * never touches Message rows itself.
 *
 * Same established pattern as every other service in this codebase:
 * typed `ConversationServiceError` + a single error->HTTP-status
 * mapper reused by every route under src/app/api/conversations,
 * participant-membership checked here (not just in the route), no
 * mock data — every read/write goes through Prisma.
 *
 * NOTE ON VERIFICATION: same sandbox limitation documented in
 * src/services/auth.service.ts / request.service.ts / offer.service.ts
 * — `npx prisma generate` cannot complete here (network blocks
 * binaries.prisma.sh). Written directly against the real schema
 * (Conversation/ConversationParticipant/Message models).
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { notificationService } from "@/services/notification.service";
import type { ConversationDetail, ConversationSummary, MessageItem } from "@/types/domain";

export class ConversationServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "FORBIDDEN" | "VALIDATION_ERROR"
  ) {
    super(message);
    this.name = "ConversationServiceError";
  }
}

/** Single source of truth for ConversationServiceError -> HTTP status,
 * shared by every route under src/app/api/conversations. */
export function conversationServiceErrorStatus(code: ConversationServiceError["code"]): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "FORBIDDEN":
      return 403;
    case "VALIDATION_ERROR":
    default:
      return 400;
  }
}

export interface ConversationService {
  listMine(userId: string): Promise<ConversationSummary[]>;
  getById(conversationId: string, userId: string): Promise<ConversationDetail | null>;
  sendMessage(conversationId: string, senderId: string, body: string): Promise<MessageItem>;
}

// ---------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------

function participantInclude() {
  return {
    user: { include: { profile: { include: { avatar: true } } } },
  } as const;
}

function resolveDisplayName(user: {
  email: string;
  profile: { displayName: string | null } | null;
}): string {
  return user.profile?.displayName ?? user.email ?? "مستخدم مطلوب";
}

function resolveAvatarUrl(user: { profile: { avatar: { url: string } | null } | null }): string | undefined {
  return user.profile?.avatar?.url;
}

type ParticipantRow = {
  userId: string;
  lastReadAt: Date | null;
  user: {
    id: string;
    email: string;
    profile: { displayName: string | null; avatar: { url: string } | null } | null;
  };
};

function mapMessage(row: {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: Date;
  sender: { email: string; profile: { displayName: string | null; avatar: { url: string } | null } | null };
}): MessageItem {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    senderName: resolveDisplayName(row.sender),
    senderAvatarUrl: resolveAvatarUrl(row.sender),
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

export class PrismaConversationService implements ConversationService {
  async listMine(userId: string): Promise<ConversationSummary[]> {
    const conversations = await prisma.conversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        request: { select: { id: true, title: true } },
        participants: { include: participantInclude() },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });

    const summaries: ConversationSummary[] = [];
    for (const conversation of conversations) {
      const participants = conversation.participants as ParticipantRow[];
      const me = participants.find((p) => p.userId === userId);
      const other = participants.find((p) => p.userId !== userId);
      if (!other) continue; // orphaned conversation (other participant removed) — skip defensively

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: userId },
          deletedAt: null,
          createdAt: { gt: me?.lastReadAt ?? new Date(0) },
        },
      });

      const lastMessage = conversation.messages[0];

      summaries.push({
        id: conversation.id,
        requestId: conversation.requestId,
        requestTitle: conversation.request.title,
        otherParticipant: {
          id: other.user.id,
          displayName: resolveDisplayName(other.user),
          avatarUrl: resolveAvatarUrl(other.user),
        },
        lastMessage: lastMessage
          ? { body: lastMessage.body, senderId: lastMessage.senderId, createdAt: lastMessage.createdAt.toISOString() }
          : undefined,
        unreadCount,
        updatedAt: conversation.updatedAt.toISOString(),
      });
    }

    return summaries;
  }

  async getById(conversationId: string, userId: string): Promise<ConversationDetail | null> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        request: { select: { id: true, title: true } },
        participants: { include: participantInclude() },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          include: { sender: { include: { profile: { include: { avatar: true } } } } },
        },
      },
    });
    if (!conversation) return null;

    const participants = conversation.participants as ParticipantRow[];
    const me = participants.find((p) => p.userId === userId);
    const other = participants.find((p) => p.userId !== userId);
    if (!me || !other) {
      // Not a participant — never reveal that this conversation exists.
      return null;
    }

    // Opening the thread marks this viewer's side as read — same
    // "viewing = read" convention every other list/detail split in
    // this app uses (e.g. NotificationService.markRead is a separate
    // explicit action, but a conversation thread has no per-message
    // read button, so reading it IS the read action).
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });

    const messages = conversation.messages.map((m: Parameters<typeof mapMessage>[0]) => mapMessage(m));
    const lastMessage = messages[messages.length - 1];

    return {
      id: conversation.id,
      requestId: conversation.requestId,
      requestTitle: conversation.request.title,
      otherParticipant: {
        id: other.user.id,
        displayName: resolveDisplayName(other.user),
        avatarUrl: resolveAvatarUrl(other.user),
      },
      lastMessage: lastMessage
        ? { body: lastMessage.body, senderId: lastMessage.senderId, createdAt: lastMessage.createdAt }
        : undefined,
      unreadCount: 0, // just marked read above by opening this thread
      updatedAt: conversation.updatedAt.toISOString(),
      messages,
    };
  }

  async sendMessage(conversationId: string, senderId: string, body: string): Promise<MessageItem> {
    const trimmed = body.trim();
    if (!trimmed) {
      throw new ConversationServiceError("لا يمكن إرسال رسالة فارغة.", "VALIDATION_ERROR");
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });
    if (!conversation) {
      throw new ConversationServiceError("المحادثة غير موجودة.", "NOT_FOUND");
    }
    const participantIds = conversation.participants.map((p: { userId: string }) => p.userId);
    if (!participantIds.includes(senderId)) {
      throw new ConversationServiceError("لا تملك صلاحية إرسال رسالة في هذه المحادثة.", "FORBIDDEN");
    }
    if (conversation.status === "BLOCKED") {
      throw new ConversationServiceError("هذه المحادثة محظورة.", "FORBIDDEN");
    }

    const otherParticipantIds = participantIds.filter((id: string) => id !== senderId);

    // Workflow Integration phase (item 9): the message itself, the
    // conversation's `updatedAt` bump (so it resorts to the top of
    // /conversations), and the NEW_MESSAGE notification to the other
    // participant(s) must commit together.
    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const row = await tx.message.create({
        data: { conversationId, senderId, body: trimmed },
        include: { sender: { include: { profile: { include: { avatar: true } } } } },
      });

      await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

      for (const recipientId of otherParticipantIds) {
        await notificationService.notify(
          {
            userId: recipientId,
            type: "NEW_MESSAGE",
            title: "رسالة جديدة",
            body: trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed,
            linkUrl: `/conversations/${conversationId}`,
            metadata: { conversationId },
          },
          tx
        );
      }

      return row;
    });

    return mapMessage(created);
  }
}

export const conversationService = new PrismaConversationService();
