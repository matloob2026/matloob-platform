"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/ToastProvider";
import { apiFetch, ApiRequestError } from "@/lib/api-client";

/**
 * Workflow Integration phase (item 3): the message composer at the
 * bottom of a conversation thread. Same apiFetch + router.refresh()
 * convention as every other mutation in this app — no realtime/
 * websocket layer exists anywhere else in the codebase, so a sent
 * message appears once the server component re-renders with the
 * fresh message list, same as e.g. sending an offer.
 */
export function SendMessageForm({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [body, setBody] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    setIsBusy(true);
    try {
      await apiFetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: body.trim() }),
      });
      setBody("");
      router.refresh();
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.error.message : "تعذر إرسال الرسالة.";
      showToast(message, "error");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <form dir="rtl" onSubmit={handleSubmit} className="flex items-end gap-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        maxLength={4000}
        placeholder="اكتب رسالتك..."
        className="flex-1"
        disabled={isBusy}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <Button type="submit" disabled={isBusy || !body.trim()}>
        {isBusy ? "جارٍ الإرسال..." : "إرسال"}
      </Button>
    </form>
  );
}
