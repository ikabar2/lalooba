import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  // --- Supabase session refresh (skipped gracefully if not configured yet) ---
  // Required by @supabase/ssr once you HAVE a project — but the rest of the
  // site (browsing, language, geo) should never break just because auth
  // hasn't been wired up yet. Sign up/login pages will fail with a clear
  // error if you try to use them without real keys — that's expected and
  // fine. The homepage should not.
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            response.cookies.set({ name, value: "", ...options });
          },
        },
      });
      await supabase.auth.getUser();
    } catch (err) {
      console.warn("[middleware] Supabase session refresh skipped:", err);
    }
  } else {
    console.warn(
      "[middleware] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set — " +
        "auth features disabled, rest of the site still works."
    );
  }

  // --- Geo-detection (always runs, never depends on Supabase) ---
  // Vercel injects these headers automatically at the edge in production —
  // no API call, no browser permission prompt, no extra latency.
  //
  // ISSUE-4 ROOT CAUSE (US users seen as Canada): the old code did
  //   country = override ?? header ?? "CA"
  // so ANY time the country header was missing or empty (preview
  // deployments, non-Vercel hosts, the header simply not populated for a
  // given request) EVERY visitor silently became Canadian. A hardcoded
  // single-country fallback is never correct for a two-country app.
  //
  // Fix: only trust an explicit override or a real, non-empty country
  // header. When we genuinely don't know, we set NO country cookie and let
  // the UI treat the market as "unknown / show both" rather than guessing
  // wrong. A wrong guess is worse than no guess here — it hides the other
  // country's listings from someone who's actually in it.
  const override = request.nextUrl.searchParams.get("country");
  const headerCountryRaw = request.headers.get("x-vercel-ip-country");
  const headerCountry =
    headerCountryRaw && headerCountryRaw.trim() !== "" ? headerCountryRaw.trim().toUpperCase() : null;

  // Only CA / US are markets this app serves; anything else is treated as
  // unknown rather than forced into one.
  const resolvedCountry =
    override === "CA" || override === "US"
      ? override
      : headerCountry === "CA" || headerCountry === "US"
        ? headerCountry
        : null;

  if (resolvedCountry) {
    response.cookies.set("lalooba-country", resolvedCountry, { path: "/" });
  } else {
    // Explicitly clear any stale country cookie from a previous request so
    // a US user who was once mis-tagged CA doesn't stay CA. No cookie =
    // "unknown", which the marketplace treats as "show all markets".
    response.cookies.delete("lalooba-country");
  }

  // City: Vercel's x-vercel-ip-city is IP-derived and COARSE — it resolves
  // to the city registered to the visitor's ISP/gateway, which is often a
  // nearby larger city, not the user's actual town (issue-4's "Brampton
  // user shown as Mississauga"). This is an inherent limitation of IP
  // geolocation, not something better code fixes. So the city is treated as
  // a soft HINT only: used for a friendly "near {city}" label, never for
  // filtering, and only set when we actually have a header. The dev
  // override no longer invents a hardcoded city (which was itself a source
  // of wrong-city display in preview/local).
  const city = request.headers.get("x-vercel-ip-city");
  if (city && city.trim() !== "") {
    try {
      response.cookies.set("lalooba-city", decodeURIComponent(city), { path: "/" });
    } catch (err) {
      console.warn("[middleware] Couldn't decode city header:", err);
    }
  } else {
    response.cookies.delete("lalooba-city");
  }

  return response;
}

export const config = {
  // Run on every page request, skip static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images).*)"],
};
