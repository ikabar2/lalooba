"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/ensure-profile";
import { getDisplayName } from "@/lib/user-display";
import { friendlyErrorMessage } from "@/lib/error-messages";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // matches the avatars bucket's file_size_limit (001_avatars_bucket.sql)
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Private account settings vs public marketplace identity live on ONE page
// but in two clearly separated sections, matching the DB split from
// migration 002: first_name/last_name are private (only the account owner
// sees them here); display_name / city / country / avatar are the public
// marketplace identity shown to everyone. This is the "separate auth
// identity from marketplace identity" requirement made concrete in the UI.
type Profile = {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  full_name: string | null;
  city_en: string | null;
  country: "CA" | "US" | null;
  avatar_url: string | null;
};

export default function AccountPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Form field state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState<"CA" | "US" | "">("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    let supabase;
    try {
      supabase = createClient();
    } catch {
      setError("This page isn't available yet — Supabase isn't connected (.env.local).");
      setLoading(false);
      return;
    }

    supabase.auth
      .getUser()
      .then(async ({ data }) => {
        if (!data.user) {
          router.push("/login?redirect=/account");
          return;
        }
        setUserId(data.user.id);
        setEmail(data.user.email ?? null);

        // Self-heal a missing profile so the settings page works even for a
        // user created before the signup trigger existed — same guard the
        // posting flows use.
        await ensureProfile(supabase, data.user);

        const { data: profileRow, error: profileError } = await supabase
          .from("profiles")
          .select("first_name, last_name, display_name, full_name, city_en, country, avatar_url")
          .eq("id", data.user.id)
          .single();

        if (profileError) {
          console.error("[account] Failed to load profile:", profileError);
          setError(friendlyErrorMessage(profileError, "We couldn't load your profile. Please refresh the page."));
        } else if (profileRow) {
          setProfile(profileRow);
          setFirstName(profileRow.first_name ?? "");
          setLastName(profileRow.last_name ?? "");
          setDisplayName(profileRow.display_name ?? profileRow.full_name ?? "");
          setCity(profileRow.city_en ?? "");
          setCountry((profileRow.country as "CA" | "US" | null) ?? "");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("[account] Auth check failed:", err);
        setError(friendlyErrorMessage(err, "We couldn't load your account. Please refresh the page."));
        setLoading(false);
      });
  }, [router]);

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file again later
    if (!file || !userId) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setError("Please upload a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("That photo is too large. Please use an image under 2 MB.");
      return;
    }

    setError(null);
    setUploadingPhoto(true);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      // Fixed filename per user (not a random one) — upsert overwrites the
      // previous avatar in place instead of accumulating old files nobody
      // cleans up. See 001_avatars_bucket.sql for the reasoning.
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: true });

      if (uploadError) {
        console.error("[account] Avatar upload failed:", uploadError);
        setError(friendlyErrorMessage(uploadError, "We couldn't upload that photo. Please try again."));
        setUploadingPhoto(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust with a timestamp — same filename every time (upsert), so
      // without this the browser would keep showing the old cached photo.
      const bustedUrl = `${publicUrlData.publicUrl}?updated=${Date.now()}`;

      const { data: avatarRows, error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: bustedUrl })
        .eq("id", userId)
        .select();

      if (updateError) {
        console.error("[account] Saving avatar URL failed:", updateError);
        setError(friendlyErrorMessage(updateError, "Your photo uploaded, but we couldn't save it to your profile."));
        setUploadingPhoto(false);
        return;
      }

      if (!avatarRows || avatarRows.length === 0) {
        console.error("[account] Avatar update affected 0 rows — RLS or ownership issue.");
        setError("Your photo uploaded, but we couldn't attach it to your profile. Try signing out and back in.");
        setUploadingPhoto(false);
        return;
      }

      setProfile((prev) => (prev ? { ...prev, avatar_url: bustedUrl } : prev));
      setUploadingPhoto(false);
    } catch (err) {
      console.error("[account] Avatar upload threw:", err);
      setError(friendlyErrorMessage(err, "We couldn't upload that photo. Please try again."));
      setUploadingPhoto(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setError(null);
    setSavedMessage(null);

    try {
      const supabase = createClient();
      const trimmedDisplay = displayName.trim();
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();

      // display_name must never be blank — it's what the whole app shows.
      // Fall back to a first+last composite, else keep whatever was there.
      const resolvedDisplay =
        trimmedDisplay ||
        [trimmedFirst, trimmedLast].filter(Boolean).join(" ").trim() ||
        profile?.display_name ||
        "Member";

      const { data: updatedRows, error: updateError } = await supabase
        .from("profiles")
        .update({
          first_name: trimmedFirst || null,
          last_name: trimmedLast || null,
          display_name: resolvedDisplay,
          city_en: city.trim() || null,
          country: country || null,
        })
        .eq("id", userId)
        .select(); // return the updated row so we can confirm it actually persisted

      if (updateError) {
        console.error("[account] Saving profile failed:", updateError);
        setError(friendlyErrorMessage(updateError, "We couldn't save your changes. Please try again."));
        setSaving(false);
        return;
      }

      // Defensive: if RLS silently blocked the write (0 rows changed, no
      // error — the exact failure mode migration 003 fixes), the returned
      // array is empty. Surface that instead of falsely showing "Saved."
      if (!updatedRows || updatedRows.length === 0) {
        console.error("[account] Profile update affected 0 rows — RLS or ownership issue.");
        setError("We couldn't save your changes — please sign out and back in, then try again.");
        setSaving(false);
        return;
      }

      // Keep auth user_metadata in sync too — it's read before a profiles
      // row is fetched elsewhere, so letting it drift would be a subtle bug.
      await supabase.auth.updateUser({ data: { full_name: resolvedDisplay, display_name: resolvedDisplay } });

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              first_name: trimmedFirst || null,
              last_name: trimmedLast || null,
              display_name: resolvedDisplay,
              city_en: city.trim() || null,
              country: country || null,
            }
          : prev
      );
      setDisplayName(resolvedDisplay);
      setSavedMessage("Saved.");
      setSaving(false);
    } catch (err) {
      console.error("[account] Saving profile threw:", err);
      setError(friendlyErrorMessage(err, "We couldn't save your changes. Please try again."));
      setSaving(false);
    }
  }

  const resolvedDisplayName = getDisplayName({ display_name: profile?.display_name, full_name: profile?.full_name, email });

  return (
    <>
      <Header detectedCity={null} />

      <main className="mx-auto max-w-lg px-5 py-10">
        {loading ? (
          <p className="text-sm text-navy-600">Loading your account…</p>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h1 className="mb-1 font-display text-2xl font-medium text-navy-900">
                  Welcome, {resolvedDisplayName}
                </h1>
                <p className="text-sm text-navy-600">Account settings &amp; marketplace profile.</p>
              </div>
              {userId && (
                <Link
                  href={`/seller/${userId}`}
                  className="shrink-0 rounded-md border border-navy-200 px-3 py-2 text-xs font-semibold text-navy-900 transition hover:bg-navy-50"
                >
                  View public profile →
                </Link>
              )}
            </div>

            {error && (
              <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm leading-relaxed text-red-700">{error}</p>
            )}
            {savedMessage && (
              <p className="mb-4 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-700">{savedMessage}</p>
            )}

            <div className="rounded-xl border border-navy-100 bg-white p-6">
              {/* ---- Public marketplace identity ---- */}
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-navy-400">
                Public profile
              </p>
              <p className="mb-4 text-xs text-navy-500">Shown to other members across the marketplace.</p>

              <label className="mb-2 block text-xs font-semibold text-navy-700">Profile photo</label>
              <div className="mb-5 flex items-center gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-navy-50">
                  {profile?.avatar_url ? (
                    <Image src={profile.avatar_url} alt="" fill sizes="80px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-bold text-navy-400">
                      {resolvedDisplayName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="rounded-md border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-navy-50 disabled:opacity-50"
                  >
                    {uploadingPhoto ? "Uploading…" : "Change photo"}
                  </button>
                  <p className="mt-1.5 text-xs text-navy-500">JPG, PNG, or WEBP. Up to 2 MB.</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
              </div>

              <form onSubmit={handleSave}>
                <label className="mb-1 block text-xs font-semibold text-navy-700">Display name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Karim M."
                  className="mb-1 w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
                />
                <p className="mb-4 text-xs text-navy-500">
                  Shown across the site instead of your email — header, messages, and your seller profile.
                </p>

                <div className="mb-5 grid grid-cols-[1fr_auto] gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-navy-700">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Mississauga"
                      className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-navy-700">Country</label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value as "CA" | "US" | "")}
                      className="rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
                    >
                      <option value="">—</option>
                      <option value="CA">Canada</option>
                      <option value="US">United States</option>
                    </select>
                  </div>
                </div>

                {/* ---- Private account details ---- */}
                <div className="mb-5 border-t border-navy-100 pt-5">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wide text-navy-400">
                    Private details
                  </p>
                  <p className="mb-4 text-xs text-navy-500">Only visible to you. Never shown publicly.</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-navy-700">First name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-navy-700">Last name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-navy-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </form>

              <div className="mt-6 border-t border-navy-100 pt-4">
                <p className="text-xs text-navy-500">
                  Email (private): <span className="font-medium text-navy-700">{email}</span>
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
