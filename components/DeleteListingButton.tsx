"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyErrorMessage } from "@/lib/error-messages";
import ConfirmModal from "./ConfirmModal";

// Delete-listing control for the owner's own listing. Confirmation modal
// first, then deletes the row (RLS "Sellers can delete their own listings"
// ensures only the owner can), and navigates back to the marketplace with a
// refresh so the deleted item is gone from the feed immediately.
export default function DeleteListingButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      if (!supabase) return;
      const { data: rows, error: delError } = await supabase
        .from("listings")
        .delete()
        .eq("id", listingId)
        .select("id"); // confirm deletion; select only id (no RETURNING *)

      if (delError) {
        console.error("[delete-listing] failed:", delError);
        setError(friendlyErrorMessage(delError, "We couldn't delete this listing. Please try again."));
        setLoading(false);
        return;
      }
      if (!rows || rows.length === 0) {
        // RLS blocked it (not the owner) or already gone — surface honestly.
        setError("This listing couldn't be deleted — you may not have permission, or it's already gone.");
        setLoading(false);
        return;
      }

      // Gone. Back to the marketplace, refreshed so the feed re-queries.
      router.push("/marketplace");
      router.refresh();
    } catch (err) {
      console.error("[delete-listing] threw:", err);
      setError(friendlyErrorMessage(err, "We couldn't delete this listing. Please try again."));
      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
      >
        Delete listing
      </button>

      <ConfirmModal
        open={showConfirm}
        title="Delete this listing?"
        message="This permanently removes the listing from the marketplace. This can't be undone."
        confirmLabel="Delete listing"
        loading={loading}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
