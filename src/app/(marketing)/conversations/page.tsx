import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth/auth";
import { conversationService } from "@/services/conversation.service";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "المحادثات | مطلوب",
};

/**
 * Workflow Integration phase: every conversation the signed-in user is
 * a participant of — opened automatically when a buyer accepts an
 * offer (see OfferService.accept), never created directly by a user.
 * Newest-activity first (ConversationService.listMine already orders
 * by `updatedAt: "desc"`, which advances on every new message).
 */
export default async function ConversationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/conversations");
  }

  const conversations = await conversationService.listMine(session.user.id);

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <SiteHeader title="المحادثات" />
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-extrabold text-navy-950 sm:text-3xl">المحادثات</h1>
          <p className="mt-1 text-sm text-text-500">
            {conversations.length > 0 ? `لديك ${conversations.length} محادثة` : "لا توجد محادثات بعد"}
          </p>
        </div>

        {conversations.length === 0 ? (
          <Card className="text-center text-sm text-text-500">
            تُفتح المحادثة تلقائيًا عند قبول عرض على أحد طلباتك، أو عند قبول أحد عروضك.
          </Card>
        ) : (
          <div className="space-y-3">
            {conversations.map((c) => (
              <Link key={c.id} href={`/conversations/${c.id}`} className="block">
                <Card className="transition hover:shadow-card-lg">
                  <div className="flex items-start gap-3">
                    {c.otherParticipant.avatarUrl ? (
                      <Image
                        src={c.otherParticipant.avatarUrl}
                        alt={c.otherParticipant.displayName}
                        width={44}
                        height={44}
                        className="h-11 w-11 flex-shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-navy-950 text-sm font-bold text-white">
                        {c.otherParticipant.displayName.trim().charAt(0).toUpperCase() || "؟"}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display text-sm font-extrabold text-navy-950">
                          {c.otherParticipant.displayName}
                        </p>
                        {c.unreadCount > 0 && <Badge tone="info">{c.unreadCount}</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-text-400">بخصوص: {c.requestTitle}</p>
                      {c.lastMessage && (
                        <p className="mt-1.5 line-clamp-1 text-sm text-text-700">{c.lastMessage.body}</p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
