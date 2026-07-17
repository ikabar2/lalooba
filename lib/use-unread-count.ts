"use client";

import { useEffect, useState } from "react";
import { createClientAsync } from "./supabase/client";

// ============================================================================
// Shared unread-message count.
//
// Header (desktop badge) and MobileBottomNav (tab badge) both need this
// number. Previously EACH ran its own 30s poll — the bottom nav is CSS-hidden
// on desktop but still mounted, so every user paid for two identical RPC
// streams (4 calls/min instead of 2). This module keeps ONE poll and ONE
// cached value at module level; any number of components subscribe through
// the hook and re-render together.
//
// It uses createClientAsync() (not the sync accessor) deliberately: mount
// effects can run before LanguageProvider primes the runtime config in the
// degraded no-inlined-env path, and the sync accessor would return null
// forever from this effect's perspective. The async accessor awaits priming,
// so the badge works even when build-time env inlining failed.
// ============================================================================

let currentCount = 0;
const listeners = new Set<(n: number) => void>();
let pollInterval: ReturnType<typeof setInterval> | null = null;
let onVisible: (() => void) | null = null;
let fetching = false;

function publish(n: number) {
  currentCount = n;
  listeners.forEach((l) => l(n));
}

async function fetchCount() {
  if (fetching) return; // collapse overlapping triggers (poll + focus + realtime)
  fetching = true;
  try {
    const supabase = await createClientAsync();
    if (!supabase) return; // config truly unavailable — keep last known value
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      publish(0);
      return;
    }
    const { data: count } = await supabase.rpc("unread_message_count");
    publish(typeof count === "number" ? count : 0);
  } catch {
    publish(0);
  } finally {
    fetching = false;
  }
}

/**
 * Ask for a re-fetch now — called by Header's realtime subscription when a
 * message arrives / gets read, by navigation (opening a thread marks it
 * read), and by auth transitions (sign-out fetch resolves to 0).
 */
export function refreshUnreadCount() {
  void fetchCount();
}

/** Subscribe to the shared unread count. */
export function useUnreadCount(): number {
  const [count, setCount] = useState(currentCount);

  useEffect(() => {
    listeners.add(setCount);
    setCount(currentCount); // sync with cache in case it moved before mount

    // First subscriber starts the shared machinery; last one tears it down.
    if (listeners.size === 1) {
      void fetchCount();
      pollInterval = setInterval(() => void fetchCount(), 30000);
      onVisible = () => {
        if (document.visibilityState === "visible") void fetchCount();
      };
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("focus", onVisible);
    }

    return () => {
      listeners.delete(setCount);
      if (listeners.size === 0) {
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        if (onVisible) {
          document.removeEventListener("visibilitychange", onVisible);
          window.removeEventListener("focus", onVisible);
          onVisible = null;
        }
      }
    };
  }, []);

  return count;
}
