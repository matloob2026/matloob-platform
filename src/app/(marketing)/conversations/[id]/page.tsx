import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth/auth";
import { conversationService } from "@/services/conversation.service";
import { Card } from "@/components/ui/Card";
import { SendMessageForm } from "@/components/conversations/SendMessageForm";
import { SiteHeader } from "@/components/layout/SiteHeader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return { title: "المحادثة | مطلوب" };
  const conversation = await conversationService.getById(id, session.user.id);
  return { title: conversation ? `محادثة مع ${conversation.otherParticipant.displayName} | مطلوب` : "المحادثة غير موجودة | مطلوب" };
}

/**
 * Workflow Integration phase (item 2 + item 3): the conversation
 * thread — where "redirect both parties to the conversation" (item 2)
 * actually lands, and where messages are read/sent (item 3).
 * Participant-only: ConversationService.getById returns null for
 * anyone who isn't a party to it, same "don't reveal it exists"
 * posture as the Offer Details page. Opening this page also marks the
 * viewer's side as read (see the service method).
 */
export default async function ConversationThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/conversations/${id}`);
  }

  const conversation = await conversationService.getById(id, session.user.id);
  if (!conversation) notFound();

  const viewerId = session.user.id;

  return (
    <main dir="rtl" className="min-h-screen bg-surface-muted px-4 py-10 sm:py-16">
      <SiteHeader title="المحادثة" />
      <div className="mx-auto max-w-2xl">
        <Card className="mb-4">
          <p className="text-xs text-text-400">محادثة مع</p>
          <p className="font-display text-lg font-extrabold text-navy-950">
            {conversation.otherParticipant.displayName}
          </p>
          <Link
            href={`/requests/${conversation.requestId}`}
            className="mt-1 inline-block text-xs font-semibold text-teal-700 hover:underline"
          >
            بخصوص الطلب: {conversation.requestTitle}
          </Link>
        </Card>

        <Card className="mb-4">
          {conversation.messages.length === 0 ? (
            <p className="text-center text-sm text-text-500">لا توجد رسائل بعد. ابدأ المحادثة أدناه.</p>
          ) : (
            <div className="space-y-3">
              {conversation.messages.map((message) => {
                const isMine = message.senderId === viewerId;
                return (
                  <div key={message.id} className={`flex ${isMine ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        isMine ? "bg-navy-950 text-white" : "bg-surface-muted text-text-700"
                      }`}
                    >
                      <p className="whitespace-pre-line">{message.body}</p>
                      <p className={`mt-1 text-[10px] ${isMine ? "text-white/60" : "text-text-400"}`}>
                        {new Date(message.createdAt).toLocaleString("ar-SA")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <SendMessageForm conversationId={conversation.id} />
      </div>
    </main>
  );
}
