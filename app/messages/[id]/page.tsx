import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Header from "@/components/Header";
import MessageThread from "@/components/MessageThread";
import { cookies } from "next/headers";

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
        "p1:profiles!conversations_participant_one_fkey(id, full_name), " +
        "p2:profiles!conversations_participant_two_fkey(id, full_name)"
    )
    .eq("id", id)
    .single();

  // RLS already blocks non-participants from reading this row at all, so a
  // null result here means either it doesn't exist or it's not theirs —
  // both correctly result in a 404, never leaking which case it was.
  if (!conversation) return notFound();

  const other =
    (conversation as any).participant_one === userId
      ? (conversation as any).p2
      : (conversation as any).p1;

  const { data: initialMessages } = await supabase
    .from("messages")
    .select("id, sender_id, content, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  return (
    <>
      <Header detectedCity={detectedCity} />
      <MessageThread
        conversationId={id}
        currentUserId={userId}
        otherUserName={other?.full_name ?? "Unknown user"}
        initialMessages={initialMessages ?? []}
      />
    </>
  );
}
