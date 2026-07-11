"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureProfile } from "@/lib/ensure-profile";
import { friendlyErrorMessage } from "@/lib/error-messages";
import { safeRandomId } from "@/lib/safe-random-id";
import { isHeic, convertHeicToJpeg } from "@/lib/heic";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type PendingImage = {
  file: File;
  previewUrl: string;
};

const MAX_IMAGES = 6;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB — matches the bucket's file_size_limit
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export default function PostListingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file again later
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
    } catch {
      setLoading(false);
      setError("Posting isn't available yet — Supabase isn't connected (.env.local).");
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
          Post a listing
        </h1>
        <p className="mb-6 text-sm text-navy-600">
          Free to post. New, unverified accounts may have listings held for
          quick review — that&apos;s automatic, not personal.
        </p>

        <form onSubmit={handleSubmit} className="rounded-xl border border-navy-100 bg-white p-6">
          {error && (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          {/* Photos first — this is what actually drives clicks, so it
              shouldn't be an afterthought at the bottom of the form */}
          <label className="mb-1 block text-xs font-semibold text-navy-700">
            Photos ({images.length}/{MAX_IMAGES})
          </label>
          <p className="mb-2 text-xs text-navy-500">
            Add a few angles — listings with multiple photos get more messages.
          </p>

          <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((img, i) => (
              <div key={img.previewUrl} className="group relative aspect-square overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element -- object-URL blob preview; next/image can't optimize createObjectURL sources */}
                <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 rounded bg-navy-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  aria-label="Remove photo"
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
                <span className="text-[10px] font-semibold">Add photo</span>
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
            <p className="mt-2 text-xs text-navy-500">Processing photo…</p>
          )}

          <label className="mb-1 mt-4 block text-xs font-semibold text-navy-700">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sudanese Thobe — white cotton"
            className="mb-4 w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
          />

          <label className="mb-1 block text-xs font-semibold text-navy-700">
            Price ({country === "US" ? "USD" : "CAD"})
          </label>
          <input
            required={!contactForPrice}
            disabled={contactForPrice}
            type="number"
            min="0"
            step="0.01"
            value={contactForPrice ? "" : price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={contactForPrice ? "Buyers will contact you for the price" : undefined}
            className="mb-2 w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400 disabled:bg-navy-50 disabled:text-navy-400"
          />
          <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-navy-700">
            <input
              type="checkbox"
              checked={contactForPrice}
              onChange={(e) => setContactForPrice(e.target.checked)}
              className="h-4 w-4 rounded border-navy-300 text-orange-500 focus:ring-orange-400"
            />
            Contact for price (don&apos;t show a fixed price)
          </label>

          <div className="mb-4 flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-navy-700">City</label>
              <input
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-navy-700">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
              >
                <option value="CA">Canada</option>
                <option value="US">United States</option>
              </select>
            </div>
          </div>

          <label className="mb-1 block text-xs font-semibold text-navy-700">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mb-4 w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
          >
            <option value="cat_clothing">👕 Clothing</option>
            <option value="cat_food">🍲 Food</option>
            <option value="cat_crafts">💍 Jewelry &amp; Accessories</option>
            <option value="cat_homemade">🥘 Homemade Cook</option>
            <option value="cat_electronics">💻 Electronics</option>
            <option value="cat_cars">🚗 Cars</option>
            <option value="cat_barbershop">📚 Books, Arts &amp; Gifts</option>
            <option value="cat_tax">🧘 Health &amp; Wellness</option>
            <option value="cat_other">➕ Other</option>
          </select>

          {category === "cat_homemade" && (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy-700">
                    Quantity (portions)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 10"
                    className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-navy-700">
                    Pickup / delivery
                  </label>
                  <select
                    value={fulfillment}
                    onChange={(e) => setFulfillment(e.target.value)}
                    className="w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
                  >
                    <option value="pickup">Pickup only</option>
                    <option value="delivery">Delivery only</option>
                    <option value="both">Pickup or delivery</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <label className="mb-1 block text-xs font-semibold text-navy-700">Description</label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mb-5 w-full rounded-md border border-navy-100 px-3 py-2 text-sm outline-none focus:border-navy-400"
          />

          {uploadProgress && (
            <p className="mb-3 text-xs font-medium text-navy-600">{uploadProgress}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-navy-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800 disabled:opacity-50"
          >
            {loading ? "Publishing…" : "Publish listing"}
          </button>
        </form>
      </main>

      <Footer />
    </>
  );
}
