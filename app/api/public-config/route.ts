import { NextResponse } from "next/server";

// Runtime public configuration endpoint.
//
// WHY THIS EXISTS: NEXT_PUBLIC_* vars are inlined into the browser bundle at
// BUILD time. In some deployment setups that inlining doesn't happen (env var
// added after build, build cache, or bundler edge cases), leaving the browser
// with an undefined key while the SERVER always has the real value at runtime.
// This route exposes ONLY the public, client-safe Supabase config (the same
// values that are meant to ship to the browser anyway — the anon/publishable
// key is designed to be public), read from the server's runtime env. The
// browser client falls back to this if the inlined value is missing, so auth
// works even when build-time inlining fails.
//
// SECURITY: only the URL and the ANON/PUBLISHABLE key are returned — never the
// service_role/secret key. These are the same low-privilege values already
// exposed in the client bundle; serving them at runtime changes nothing about
// the security posture (RLS remains the boundary).
export const dynamic = "force-dynamic"; // never cached; always reflects current env

export function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  return NextResponse.json(
    { url, anonKey },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
