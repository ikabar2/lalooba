import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Header from "@/components/Header";
import MessageThread from "@/components/MessageThread";
import { cookies } from "next/headers";
import { getDisplayName } from "@/lib/user-display";

export const dynamic = "force-dynamic";

function one<T>(rel: T | T[] | null | undefined): T | null {
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
      </>
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?redirect=/messages/${id}`);

  const userId = userData.user.id;

  const { data: conversation } = await supabase
    .from("conversations")
    .select(
      "id, participant_one, participant_two, " +
        "p1:profiles!conversations_participant_one_fkey(id, display_name, full_name), " +
        "p2:profiles!conversations_participant_two_fkey(id, display_name, full_name)"
    )
    .eq("id", id)
    .single();

  // RLS already blocks non-participants from reading this row at all, so a
  // null result here means either it doesn't exist or it's not theirs —
  // both correctly result in a 404, never leaking which case it was.
  if (!conversation) return notFound();

  // Cast through `unknown` to a concrete shape once — PostgREST's inferred
  // type is a union that includes an error variant, which TS won't let us
  // narrow to an object shape directly.
  const conv = conversation as unknown as {
    participant_one: string;
    p1: { display_name?: string | null; full_name?: string | null } | { display_name?: string | null; full_name?: string | null }[] | null;
    p2: { display_name?: string | null; full_name?: string | null } | { display_name?: string | null; full_name?: string | null }[] | null;
  };
  const otherRaw = conv.participant_one === userId ? conv.p2 : conv.p1;
  const other = one(otherRaw);

  const { data: initialMessages } = await supabase
    .from("messages")
    .select("id, sender_id, content, created_at, read_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  // Mark everything the current user has received in this thread as read,
  // now that they've opened it. Persisted server-side (messages.read_at), so
  // the seen state survives reloads and updates the sender's view too.
  await supabase.rpc("mark_conversation_read", { p_conversation_id: id });

  return (
    <>
      <Header detectedCity={detectedCity} />
      <MessageThread
        conversationId={id}
        currentUserId={userId}
        otherUserName={getDisplayName(
          { display_name: other?.display_name, full_name: other?.full_name },
          "Member"
        )}
        initialMessages={initialMessages ?? []}
      />
    </>
  );
}
