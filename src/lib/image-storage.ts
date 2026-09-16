import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

// Supabase's free tier gives 1GB of Storage total, so every photo is capped
// well below what a phone camera produces (compress-image.ts already resizes
// to at most 1600px before this runs).
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "listing-photos";

function storageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Image storage is not configured on the server.");
  return createClient(url, key);
}

// Deliberately excludes image/svg+xml: an SVG can embed <script>, and unlike
// raster formats it can execute if the uploaded file is ever opened directly
// (not just rendered inside an <img>) — there's no legitimate use of SVG
// uploads here (photos come from a camera or compress-image.ts, never a
// vector), so it's simplest to not accept the format at all.
const ALLOWED_IMAGE_TYPES = /^(jpe?g|png|webp|gif)$/;

// The `data:` prefix only says what the browser *claims* the file is — nothing
// upstream actually decodes these as images, so without this a non-image file
// could be stored and served from the bucket under an image content-type.
// Checking the real magic bytes catches that regardless of the claimed type.
function matchesImageMagicBytes(buffer: Buffer, subtype: string): boolean {
  if (buffer.length < 12) return false;
  switch (subtype) {
    case "png": return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "jpg": case "jpeg": return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "gif": return buffer.subarray(0, 4).toString("ascii") === "GIF8";
    case "webp": return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    default: return false;
  }
}

export async function uploadImage(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match || !ALLOWED_IMAGE_TYPES.test(match[1].split("/")[1] || "")) throw new Error("A valid image is required.");
  const [, contentType, base64] = match;
  const buffer = Buffer.from(base64, "base64");
  if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error(`Image must be ${MAX_IMAGE_BYTES / (1024 * 1024)}MB or smaller.`);
  if (!matchesImageMagicBytes(buffer, contentType.split("/")[1] || "")) throw new Error("A valid image is required.");

  const extension = contentType.split("/")[1] || "jpg";
  const path = `${randomUUID()}.${extension}`;
  const supabase = storageClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
