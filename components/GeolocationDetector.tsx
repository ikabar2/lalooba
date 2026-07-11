"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { refreshIfAlreadyGranted } from "@/lib/geolocate";

// Startup location behaviour — NON-PROMPTING.
//
// New users must NOT see a location popup on load (it's unexpected and scares
// people off). So on startup we do the silent, zero-prompt thing:
//   • IP geolocation (middleware) has already set a rough country/city cookie
//     with no permission and no popup — that's the default experience.
//   • Here we ONLY upgrade to precise GPS if the browser reports permission
//     was ALREADY granted on a previous visit (checked via the Permissions
//     API, which never triggers a prompt). If it's "prompt" or "denied", we
//     do nothing and leave the IP-based value in place.
//
// The precise-location popup now appears only when the user explicitly asks
// for it (the "Use my location" control in the header), never automatically.
export default function GeolocationDetector() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    refreshIfAlreadyGranted().then((changed) => {
      if (changed && !cancelled) router.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
