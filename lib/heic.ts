// Detect and convert HEIC/HEIF photos (the default format on modern iPhones
// and Samsung phones) to JPEG in the browser before upload.
//
// WHY THIS IS NEEDED: browsers can't render HEIC, and our storage pipeline
// only accepts web-displayable formats. A HEIC upload would either be
// rejected outright or stored as an image nothing can display. Converting to
// JPEG client-side fixes both: the file passes validation AND renders
// everywhere afterward. Conversion happens on the user's device, so no HEIC
// ever reaches the server.

// A file is HEIC/HEIF if EITHER its MIME type says so, OR its extension is
// .heic/.heif. The extension alone is decisive: browsers are wildly
// inconsistent about the MIME type they attach to HEIC files — sometimes
// "image/heic", but often an empty string, or "application/octet-stream",
// depending on OS/browser/how the file was picked. The previous version
// required the type to be empty when matching by extension, so a .heic file
// reported as "application/octet-stream" slipped through and got rejected as
// "not a supported image format". Trusting the extension outright fixes that;
// if conversion later fails we still surface a clear per-file error.
export function isHeic(file: File): boolean {
  const name = file.name.toLowerCase();
  const byExt = name.endsWith(".heic") || name.endsWith(".heif");
  const byType = /image\/hei[cf]/i.test(file.type);
  return byExt || byType;
}

// Convert a HEIC/HEIF File to a JPEG File. Loads heic2any dynamically so it's
// only fetched when someone actually uploads a HEIC (keeps the normal-path
// bundle small). Returns a new File with a .jpg name and image/jpeg type.
export async function convertHeicToJpeg(file: File): Promise<File> {
  // Dynamic import: only pulled in when a HEIC is actually selected.
  const heic2any = (await import("heic2any")).default as (opts: {
    blob: Blob;
    toType?: string;
    quality?: number;
  }) => Promise<Blob | Blob[]>;

  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
  // heic2any can return a single Blob or an array (multi-image HEIC); take the
  // first frame in the array case.
  const blob = Array.isArray(converted) ? converted[0] : converted;

  const newName = file.name.replace(/\.hei[cf]$/i, ".jpg");
  return new File([blob], newName || "photo.jpg", { type: "image/jpeg" });
}
