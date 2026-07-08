"use client";

import { useEffect } from "react";

/**
 * Disables the right-click context menu and a handful of common DevTools
 * shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U).
 *
 * HONEST LIMITATION — read before assuming this protects anything:
 * Anyone can still open DevTools through the browser's own menu (no
 * right-click or shortcut required), and nothing here prevents viewing
 * page source, inspecting network requests, or reading any client-side
 * code or data. This only removes the most casual, accidental path to
 * those tools — it is a UX deterrent, not a security control. Real
 * protection lives server-side: RLS policies, the fraud-check function,
 * and never shipping secrets to the client — none of that is affected by
 * this component either way.
 *
 * Also worth knowing: this disables right-click for everyone, including
 * legitimate uses like "open link in new tab" or copying text — that's a
 * real usability cost you're choosing to accept here.
 */
export default function DisableInspect() {
  useEffect(() => {
    function blockContextMenu(e: MouseEvent) {
      e.preventDefault();
    }

    function blockDevToolsShortcuts(e: KeyboardEvent) {
      const blockedCombos =
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toUpperCase() === "U");

      if (blockedCombos) {
        e.preventDefault();
      }
    }

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockDevToolsShortcuts);

    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockDevToolsShortcuts);
    };
  }, []);

  return null;
}
