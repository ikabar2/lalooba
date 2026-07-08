import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Async because Next.js 15 made cookies() return a Promise (breaking change
// from 14). Callers must `await createClient()`. Works on 14.2+ too, where
// awaiting cookies() is supported for forward-compatibility.
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart `npm run dev`."
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Called from a Server Component, not a Server Action/Route
          // Handler — safe to ignore, middleware refreshes the session.
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Same as above — safe to ignore here.
        }
      },
    },
  });
}
