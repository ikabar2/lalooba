import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { cookies } from "next/headers";

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

  const { data: conversations } = await supabase
    .from("conversations")
    .select(
      "id, last_message_at, participant_one, participant_two, listing_id, " +
        "p1:profiles!conversations_participant_one_fkey(id, full_name), " +
        "p2:profiles!conversations_participant_two_fkey(id, full_name)"
    )
    .or(`participant_one.eq.${userId},participant_two.eq.${userId}`)
    .order("last_message_at", { ascending: false });

  return (
    <>
      <Header detectedCity={detectedCity} />

      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="mb-5 font-display text-2xl font-medium text-navy-900">Messages</h1>

        {!conversations || conversations.length === 0 ? (
          <div className="rounded-xl border border-navy-100 bg-white p-8 text-center">
            <p className="mb-3 text-sm text-navy-600">No conversations yet.</p>
            <Link
              href="/messages/new"
              className="text-sm font-semibold text-navy-900 underline"
            >
              Start one to test messaging →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {conversations.map((conv: any) => {
              const other =
                conv.participant_one === userId ? conv.p2 : conv.p1;
              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className="flex items-center gap-3 rounded-xl border border-navy-100 bg-white p-4 transition hover:border-navy-200 hover:shadow-sm"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-sm font-bold text-navy-900">
                    {other?.full_name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy-900">
                      {other?.full_name ?? "Unknown user"}
                    </p>
                    <p className="text-xs text-navy-500">
                      {new Date(conv.last_message_at).toLocaleString()}
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
