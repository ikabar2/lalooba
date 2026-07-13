import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { cookies } from "next/headers";
import { getDisplayName } from "@/lib/user-display";

export const dynamic = "force-dynamic";

// Normalize a PostgREST embedded relation that may come back as a 1-element
// array into a single record.
function one<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

export default async function MessagesPage() {
  const detectedCity = (await cookies()).get("lalooba-city")?.value ?? null;

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return (
      <>
        <Header detectedCity={detectedCity} />
        <main className="mx-auto max-w-2xl px-5 py-12 text-center text-navy-600">
          Messaging isn&apos;t available yet — Supabase isn&apos;t connected (.env.local).
        </main>
        <Footer />
      </>
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login?redirect=/messages");
  const userId = userData.user.id;

  // Conversations the user is part of, newest activity first. display_name
  // (with full_name fallback) matches how the rest of the app names people.
  const { data: conversationsRaw } = await supabase
    .from("conversations")
    .select(
      "id, last_message_at, participant_one, participant_two, listing_id, " +
        "p1:profiles!conversations_participant_one_fkey(id, display_name, full_name), " +
        "p2:profiles!conversations_participant_two_fkey(id, display_name, full_name)"
    )
    .or(`participant_one.eq.${userId},participant_two.eq.${userId}`)
    .order("last_message_at", { ascending: false });

  type ProfileRel = { id: string; display_name?: string | null; full_name?: string | null };
  type ConvRow = {
    id: string;
    last_message_at: string;
    participant_one: string;
    participant_two: string;
    listing_id: string | null;
    p1: ProfileRel | ProfileRel[] | null;
    p2: ProfileRel | ProfileRel[] | null;
  };
  const conversations = (conversationsRaw ?? []) as unknown as ConvRow[];

  // Per-conversation unread counts (messages received & not yet read) plus
  // the newest-message preview for each thread, both in single round-trips.
  // conversation_previews() returns exactly ONE row per conversation
  // (DISTINCT ON, index-served) instead of the previous approach of fetching
  // every message the user has ever exchanged — which grew unboundedly with
  // message history.
  const convIds = conversations.map((c) => c.id);
  let unreadRows: { conversation_id: string; unread: number }[] = [];
  let lastMessages: { conversation_id: string; content: string; sender_id: string }[] = [];
  if (convIds.length > 0) {
    const [unreadRes, previewRes] = await Promise.all([
      supabase.rpc("unread_counts_by_conversation"),
      supabase.rpc("conversation_previews"),
    ]);
    unreadRows = (unreadRes.data as typeof unreadRows) ?? [];
    if (previewRes.error) {
      // Fallback for a DB that hasn't run migration 020 yet: the old query,
      // bounded to recent messages so it can't transfer unbounded data.
      console.error(
        "[messages] conversation_previews RPC unavailable (run migration 020). Falling back:",
        previewRes.error.message
      );
      const { data } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at, sender_id")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false })
        .limit(500);
      lastMessages = (data as unknown as typeof lastMessages) ?? [];
    } else {
      lastMessages = (previewRes.data as typeof lastMessages) ?? [];
    }
  }

  const unreadByConv = new Map<string, number>(
    (unreadRows ?? []).map((r: { conversation_id: string; unread: number }) => [r.conversation_id, r.unread])
  );

  // Keep only the newest message per conversation for the preview line.
  const lastByConv = new Map<string, { content: string; sender_id: string }>();
  for (const m of lastMessages ?? []) {
    if (!lastByConv.has(m.conversation_id)) {
      lastByConv.set(m.conversation_id, { content: m.content, sender_id: m.sender_id });
    }
  }

  // Prioritize unread conversations at the top. Within each group (unread /
  // read) keep the existing newest-activity-first order. A stable sort on the
  // already-recency-ordered list gives exactly that: all unread threads
  // first (newest unread at top), then all read threads (newest first).
  const sortedConversations = [...conversations].sort((a, b) => {
    const aUnread = (unreadByConv.get(a.id) ?? 0) > 0 ? 1 : 0;
    const bUnread = (unreadByConv.get(b.id) ?? 0) > 0 ? 1 : 0;
    return bUnread - aUnread; // unread (1) before read (0)
  });

  return (
    <>
      <Header detectedCity={detectedCity} />

      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="mb-5 font-display text-2xl font-medium text-navy-900">Messages</h1>

        {conversations.length === 0 ? (
          <div className="rounded-xl border border-navy-100 bg-white p-8 text-center">
            <p className="text-sm text-navy-600">No conversations yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedConversations.map((conv) => {
              const otherRaw = conv.participant_one === userId ? conv.p2 : conv.p1;
              const other = one(otherRaw);
              const name = getDisplayName(
                { display_name: other?.display_name, full_name: other?.full_name },
                "Member"
              );
              const unread = unreadByConv.get(conv.id) ?? 0;
              const last = lastByConv.get(conv.id);
              const preview = last
                ? `${last.sender_id === userId ? "You: " : ""}${last.content}`
                : "";

              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className={`flex items-center gap-3 rounded-xl border p-4 transition hover:shadow-sm ${
                    unread > 0
                      ? "border-gold-200 bg-gold-50/40 hover:border-gold-300"
                      : "border-navy-100 bg-white hover:border-navy-200"
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-sm font-bold text-navy-900">
                    {name[0]?.toUpperCase() ?? "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-sm ${unread > 0 ? "font-bold text-navy-900" : "font-semibold text-navy-900"}`}>
                        {name}
                      </p>
                      {unread > 0 && (
                        <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                    <p className={`truncate text-xs ${unread > 0 ? "font-medium text-navy-700" : "text-navy-500"}`}>
                      {preview || new Date(conv.last_message_at).toLocaleString()}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
