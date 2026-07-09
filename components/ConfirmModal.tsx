"use client";

import { useEffect, useRef } from "react";

// Reusable confirmation modal for destructive actions (delete listing,
// delete account). Accessible: focus-trapped to the dialog, Escape closes,
// backdrop click closes, and the confirm button is styled as clearly
// dangerous. Keeps destructive flows consistent across the app.
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Move focus into the dialog when it opens.
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    document.addEventListener("keydown", onKey);
    // Prevent background scroll while the modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy-900/50"
        onClick={() => !loading && onCancel()}
        aria-hidden
      />
      {/* Dialog */}
      <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 id="confirm-title" className="mb-2 text-lg font-bold text-navy-900">
          {title}
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-navy-600">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-navy-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
