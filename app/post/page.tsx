"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/ensure-profile";
import { friendlyErrorMessage } from "@/lib/error-messages";
import { toValidNANP } from "@/lib/phone";
import { safeRandomId } from "@/lib/safe-random-id";
import { isHeic, convertHeicToJpeg } from "@/lib/heic";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type PendingImage = {
  file: File;
  previewUrl: string;
};

const MAX_IMAGES = 4;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB — matches the bucket's file_size_limit
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export default function PostListingPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  // Seller onboarding: a phone number is required to POST (not to browse or
  // buy). If the seller's profile doesn't have one yet, this field appears
  // and is saved to their profile with their first listing.
  const [sellerPhone, setSellerPhone] = useState("");
  const [needsPhone, setNeedsPhone] = useState(false);
  const [price, setPrice] = useState("");
  const [contactForPrice, setContactForPrice] = useState(false);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("CA");
  const [category, setCategory] = useState("cat_other");
  const [description, setDescription] = useState("");
  // Homemade Cook only: how many portions, and pickup/delivery.
  const [quantity, setQuantity] = useState("");
  const [fulfillment, setFulfillment] = useState("pickup");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [convertingPhoto, setConvertingPhoto] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Seller onboarding check: does this account already have a phone on file?
  // Uses the my_phone() RPC (owner-only read path from migration 014) since
  // the phone column itself is deliberately never selected by the app.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        if (!supabase) return;
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user || !active) return;
        const { data: existingPhone } = await supabase.rpc("my_phone");
        if (active) setNeedsPhone(!existingPhone);
      } catch {
        // If the check fails we simply don't gate — posting still works and
        // the DB constraint remains the backstop.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file again later
    await addFiles(files);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    // Only image files — dragging a folder or a text selection onto the zone
    // yields non-image entries; filter them here so the user isn't shown a
    // rejection list for things they never meant to upload. HEIC/HEIF name
    // matching included because some browsers report an empty MIME for them.
    const files = Array.from(e.dataTransfer.files ?? []).filter(
      (f) => f.type.startsWith("image/") || /\.hei[cf]$/i.test(f.name)
    );
    void addFiles(files);
  }

  // Shared by the file picker and the drag-and-drop zone so both paths get
  // identical validation, HEIC conversion and slot-limit handling.
  async function addFiles(files: File[]) {
    if (files.length === 0) return;

    setConvertingPhoto(true);
    const rejected: string[] = [];
    const accepted: File[] = [];

    for (const rawFile of files) {
      let file = rawFile;

      // Samsung/iPhone photos are HEIC, which browsers can't display. Convert
      // them to JPEG on-device before anything else, so they both pass the
      // format check below AND render everywhere after upload. A blank
      // file.type with a .heic name (common on Samsung) is handled too.
      if (isHeic(file)) {
        try {
          file = await convertHeicToJpeg(file);
        } catch (err) {
          console.error("[post] HEIC conversion failed:", err);
          rejected.push(`${rawFile.name} — couldn't convert this photo, try saving it as JPEG`);
          continue;
        }
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        rejected.push(`${file.name} — not a supported image format`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejected.push(`${file.name} — over 5 MB`);
        continue;
      }
      accepted.push(file);
    }

    if (rejected.length > 0) {
      setError(`Some photos couldn't be added: ${rejected.join("; ")}`);
    } else {
      setError(null);
    }

    const remainingSlots = MAX_IMAGES - images.length;
    const toAdd = accepted.slice(0, remainingSlots);

    const newImages = toAdd.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages]);
    setConvertingPhoto(false);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (images.length === 0) {
      setError("Add at least one photo — listings with photos get far more clicks.");
      return;
    }

    setLoading(true);

    let supabase;
    try {
      supabase = createClient();
      if (!supabase) throw new Error("supabase-unavailable");
    } catch {
      setLoading(false);
      setError(t("post_err_no_supabase"));
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login?redirect=/post");
      return;
    }

    // Same guard as the Jeeb Li post form — listings.seller_id references
    // profiles(id), so a user without a profiles row would hit the FK
    // violation on insert. Ensure it exists before doing the (slower) photo
    // uploads, so we fail fast rather than after uploading everything.
    const profileResult = await ensureProfile(supabase, userData.user);
    if (!profileResult.ok) {
      console.error("[post] ensureProfile failed:", profileResult.error);
      setLoading(false);
      setError(friendlyErrorMessage(profileResult.error, "We couldn't set up your profile. Please try again."));
      return;
    }

    // Seller onboarding: a phone is required to post. If the profile doesn't
    // have one yet, validate the field shown in the form and save it BEFORE
    // the (slow) photo uploads, so an invalid number fails fast.
    if (needsPhone) {
      const validPhone = toValidNANP(sellerPhone);
      if (!validPhone) {
        setLoading(false);
        setError(
          t("post_err_phone_required")
        );
        return;
      }
      const { error: phoneError } = await supabase
        .from("profiles")
        .update({ phone: validPhone })
        .eq("id", userData.user.id)
        .select("id");
      if (phoneError) {
        console.error("[post] saving seller phone failed:", phoneError);
        setLoading(false);
        setError(friendlyErrorMessage(phoneError, "We couldn't save your phone number. Please try again."));
        return;
      }
      setNeedsPhone(false);
    }

    // Upload every photo to Storage first, collecting their public URLs.
    // Path is {user_id}/{random}.{ext} — the storage RLS policies in
    // migration 006 check that first path segment matches auth.uid(), so
    // this naming is required, not just a convention.
    const uploadedUrls: string[] = [];

    for (let i = 0; i < images.length; i++) {
      setUploadProgress(`Uploading photo ${i + 1} of ${images.length}…`);

      const file = images[i].file;
      // Derive a safe extension from the MIME type (which we've already
      // allow-listed), NOT the user-controlled filename. Taking the extension
      // from file.name risks path traversal / odd characters in the storage
      // key ("evil/../../x"). The path prefix is the server-verified user id
      // plus a random id, and now the extension is a fixed known value too.
      const extByMime: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/avif": "avif",
      };
      const ext = extByMime[file.type] ?? "jpg";
      const path = `${userData.user.id}/${safeRandomId()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(path, file, { contentType: file.type });

      if (uploadError) {
        console.error("[post] Photo upload failed:", uploadError);
        setLoading(false);
        setUploadProgress(null);
        setError(friendlyErrorMessage(uploadError, "We couldn't upload that photo. Please try again."));
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("listing-images")
        .getPublicUrl(path);

      uploadedUrls.push(publicUrlData.publicUrl);
    }

    setUploadProgress(null);

    // NOTE: this inserts into a `listings` table with the same shape used by
    // the fraud-check migrations (title, price, city, country, seller_id,
    // images). Inserting here automatically fires the fraud-check trigger
    // from supabase/migrations/002_fraud_check_trigger.sql, once deployed.
    // Column names match the real schema after migration 002:
    // title_en / city_en (not the old title / city), plus category and
    // currency. title_ar / city_ar are left null — a listing is valid with
    // just the English fields, and the UI falls back to _en when _ar is null.
    const { error: insertError } = await supabase.from("listings").insert({
      title_en: title,
      // When "Contact for price" is chosen, store no price (null) and set the
      // flag; otherwise store the entered numeric price.
      price: contactForPrice ? null : Number(price),
      contact_for_price: contactForPrice,
      currency: country === "US" ? "USD" : "CAD",
      city_en: city,
      country,
      category,
      description,
      images: uploadedUrls,
      seller_id: userData.user.id,
      // Category-specific fields — only sent when relevant, else null so
      // they don't apply to listings that don't use them.
      quantity: category === "cat_homemade" && quantity ? Number(quantity) : null,
      fulfillment: category === "cat_homemade" ? fulfillment : null,
    });

    setLoading(false);

    if (insertError) {
      console.error("[post] Listing insert failed:", insertError);
      setError(friendlyErrorMessage(insertError, "We couldn't publish your listing. Please try again."));
      return;
    }

    // Navigate to the marketplace and refresh the Router Cache so the
    // freshly-inserted listing is fetched from the DB immediately, rather
    // than showing a cached feed that predates the post.
    router.push("/marketplace");
    router.refresh();
  }

  return (
    <>
      <Header detectedCity={null} />

      <main className="mx-auto max-w-lg px-5 py-10">
        <h1 className="mb-1 font-display text-2xl font-medium text-navy-900">
          {t("post_heading")}
        </h1>
        <p className="mb-6 text-sm text-navy-600">{t("post_subhead")}</p>

        <form onSubmit={handleSubmit} className="rounded-xl border border-navy-100 bg-white p-6">
          {error && (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          {/* Photos first — this is what actually drives clicks, so it
              shouldn't be an afterthought at the bottom of the form */}
          <div className="mb-2 flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-[11px] font-bold text-white"
            >
              1
            </span>
            <span className="text-sm font-semibold text-navy-900">{t("post_step_photos")}</span>
            <span className="text-xs text-navy-500" aria-live="polite">
              {images.length}/{MAX_IMAGES}
            </span>
          </div>

          {/* Prominent drop zone. Hidden once every slot is full so it can't
              imply an action that would be rejected. Drag events are also
              accepted on the whole zone (not just the button) — the label
              wrapper makes the entire area keyboard- and click-activatable
              via the file input it points at. */}
          {images.length < MAX_IMAGES && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label={`${t("post_step_photos")} — ${images.length}/${MAX_IMAGES}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`mb-3 cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
                dragActive
                  ? "border-gold-200 bg-gold-50"
                  : "border-navy-200 bg-navy-50/40 hover:border-gold-200 hover:bg-gold-50/40"
              }`}
            >
              <svg
                aria-hidden
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FF4500"
                strokeWidth="2"
                className="mx-auto"
              >
                <path d="M12 16V4m0 0L8 8m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" strokeLinecap="round" />
              </svg>
              {/* Touch devices can't drag files — show the tap wording there. */}
              <p className="mt-1.5 text-sm font-bold text-navy-900">
                <span className="hidden sm:inline">{t("post_photos_hint")}</span>
                <span className="sm:hidden">{t("post_photos_tap")}</span>
              </p>
              <p className="mt-0.5 text-xs text-navy-500">
                <span className="hidden sm:inline">
                  {t("post_photos_browse")} ·{" "}
                </span>
                {t("post_photos_meta")}
              </p>
            </div>
          )}

          <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((img, i) => (
              <div key={img.previewUrl} className="group relative aspect-square overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element -- object-URL blob preview; next/image can't optimize createObjectURL sources */}
                <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 rounded bg-navy-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {t("post_photo_cover")}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  aria-label={t("post_photo_remove")}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}

            {images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-navy-200 text-navy-400 transition hover:border-navy-400 hover:text-navy-600"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                <span className="text-[10px] font-semibold">{t("post_add_photo")}</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif,image/heic,image/heif"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          {convertingPhoto && (
            <p className="mt-2 text-xs text-navy-500">{t("post_processing_photo")}</p>
          )}

          {needsPhone && (
            <div className="mb-2 rounded-lg border border-gold-200 bg-gold-50/40 p-4">
              <label className="mb-1 block text-xs font-semibold text-navy-700">
                {t("post_phone_label")} <span className="font-normal text-navy-500">{t("post_phone_required_note")}</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-navy-100 bg-white px-2.5 py-2 text-sm font-medium text-navy-700">
                  +1
                </span>
                <input
                  type="tel"
                  value={sellerPhone}
                  onChange={(e) => setSellerPhone(e.target.value)}
                  placeholder="416 555 1234"
                  className="w-full rounded-md border border-navy-100 bg-white px-3 py-2 text-sm outline-none focus:border-navy-400"
                />
              </div>
              <p className="mt-1 text-xs text-navy-500">
                {t("post_seller_phone_help")}
              </p>
            </div>
          )}

          <div className="mb-2 mt-6 flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-[11px] font-bold text-white"
            >
              2
            </span>
            <span className="text-sm font-semibold text-navy-900">{t("post_step_what")}</span>
          </div>
          <label className="mb-1 block text-xs font-semibold text-navy-700">{t("post_title")}</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("post_title_ph")}
            className="mb-1 w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
          />
          <p className="mb-4 text-xs text-navy-500">{t("post_title_help")}</p>

          <div className="mb-2 mt-6 flex items-center gap-2">
            <span
              aria-hidden
              className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-900 text-[11px] font-bold text-white"
            >
              3
            </span>
            <span className="text-sm font-semibold text-navy-900">{t("post_step_price")}</span>
          </div>
          <label className="mb-1 block text-xs font-semibold text-navy-700">
            {t("post_price")} ({country === "US" ? "USD" : "CAD"})
          </label>
          <input
            required={!contactForPrice}
            disabled={contactForPrice}
            type="number"
            min="0"
            step="0.01"
            value={contactForPrice ? "" : price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={contactForPrice ? t("post_price_contact_ph") : undefined}
            className="mb-2 w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400 disabled:bg-navy-50 disabled:text-navy-400"
          />
          <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-navy-700">
            <input
              type="checkbox"
              checked={contactForPrice}
              onChange={(e) => setContactForPrice(e.target.checked)}
              className="h-4 w-4 rounded border-navy-300 text-orange-500 focus:ring-orange-400"
            />
            {t("post_contact_for_price")}
          </label>

          <div className="mb-4 flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-navy-700">{t("post_city")}</label>
              <input
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t("post_city_ph")}
                className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-navy-700">{t("post_country")}</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
              >
                <option value="CA">{t("post_canada")}</option>
                <option value="US">{t("post_united_states")}</option>
              </select>
            </div>
          </div>

          <label className="mb-1 block text-xs font-semibold text-navy-700">{t("post_category")}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mb-4 w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
          >
            <option value="cat_clothing">👕 {t("cat_clothing")}</option>
            <option value="cat_food">🍲 {t("cat_food")}</option>
            <option value="cat_crafts">💍 {t("cat_crafts")}</option>
            <option value="cat_homemade">🥘 {t("cat_homemade")}</option>
            <option value="cat_electronics">💻 {t("cat_electronics")}</option>
            <option value="cat_perfumes">🌸 {t("cat_perfumes")}</option>
            <option value="cat_cars">🚗 {t("cat_cars")}</option>
            <option value="cat_barbershop">📚 {t("cat_barbershop")}</option>
            <option value="cat_tax">🧘 {t("cat_tax")}</option>
            <option value="cat_other">➕ {t("cat_other")}</option>
          </select>

          {category === "cat_homemade" && (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy-700">
                    {t("post_quantity")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder={t("post_quantity_ph")}
                    className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy-700">
                    {t("post_fulfillment")}
                  </label>
                  <select
                    value={fulfillment}
                    onChange={(e) => setFulfillment(e.target.value)}
                    className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
                  >
                    <option value="pickup">{t("post_fulfillment_pickup")}</option>
                    <option value="delivery">{t("post_fulfillment_delivery")}</option>
                    <option value="both">{t("post_fulfillment_both")}</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <label className="mb-1 block text-xs font-semibold text-navy-700">{t("post_description")}</label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder={t("post_description_ph")}
            className="mb-5 w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
          />

          {uploadProgress && (
            <p className="mb-3 text-xs font-medium text-navy-600">{uploadProgress}</p>
          )}

          <div className="mt-6 border-t border-navy-100 pt-4">
            <p className="mb-3 text-xs text-navy-500">{t("post_privacy_note")}</p>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-navy-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-navy-800 disabled:opacity-50"
            >
              {loading ? t("post_publishing") : t("post_publish")}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </>
  );
}
