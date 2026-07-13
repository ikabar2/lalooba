"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export default function MessageThread({
  conversationId,
  currentUserId,
  otherUserName,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  otherUserName: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Realtime subscription — new messages from the other person appear
  // without a page refresh, this is the actual "live chat" part.
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Avoid duplicating the message we just optimistically added
            // ourselves when sending.
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setDraft("");

    const supabase = createClient();
    if (!supabase) return;
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: currentUserId, content })
      .select()
      .single();

    setSending(false);

    if (!error && data) {
      setMessages((prev) => [...prev, data as Message]);
    }
  }

  return (
    <main className="mx-auto flex h-[calc(100vh-64px)] max-w-2xl flex-col px-5">
      <div className="border-b border-navy-100 py-4">
        <Link href="/messages" className="mb-1 block text-xs text-navy-500 hover:underline">
          ← All messages
        </Link>
        <h1 className="font-display text-xl font-medium text-navy-900">{otherUserName}</h1>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-navy-500">
            No messages yet — say hello.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => {
              const mine = m.sender_id === currentUserId;
              return (
                <div
                  key={m.id}
                  className={`max-w-[75%] rounded-xl px-3.5 py-2 text-sm ${
                    mine
                      ? "ml-auto bg-navy-900 text-white"
                      : "bg-navy-50 text-navy-900"
                  }`}
                >
                  {m.content}
                  <p
                    className={`mt-0.5 text-[10px] ${
                      mine ? "text-navy-300" : "text-navy-400"
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-navy-100 py-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-lg border border-navy-100 px-3 py-2.5 text-sm outline-none focus:border-navy-400"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </main>
  );
}
