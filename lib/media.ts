"use client";
import { supabase } from "./browser";

/** Every cover photo is stored at this size, so all articles show their picture the same way. */
export const COVER_W = 1600;
export const COVER_H = 900;

function checkImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Zgjidh një foto (JPG, PNG, WEBP).");
  if (file.size > 15 * 1024 * 1024) throw new Error("Fotoja është më e madhe se 15 MB.");
}

/** Crops the middle of a photo to 16:9 and scales it to COVER_W × COVER_H as a JPEG. */
async function cropCover(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const target = COVER_W / COVER_H;
  let sw = bmp.width, sh = bmp.height, sx = 0, sy = 0;
  if (sw / sh > target) { sw = Math.round(sh * target); sx = Math.round((bmp.width - sw) / 2); }
  else { sh = Math.round(sw / target); sy = Math.round((bmp.height - sh) / 2); }
  const canvas = document.createElement("canvas");
  canvas.width = COVER_W; canvas.height = COVER_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Shfletuesi nuk mund ta përpunojë foton.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, COVER_W, COVER_H);
  bmp.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Fotoja nuk u përpunua."))), "image/jpeg", 0.86));
}

async function put(body: Blob, ext: string, contentType: string) {
  const d = new Date();
  const path = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, body, { cacheControl: "31536000", contentType });
  if (error) throw new Error("Ngarkimi dështoi: " + error.message);
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

/** Uploads a photo for inside the article text, as it is. */
export async function uploadImage(file: File) {
  checkImage(file);
  return put(file, (file.name.split(".").pop() || "jpg").toLowerCase(), file.type);
}

/** Uploads a cover photo, cropped to the fixed 16:9 cover size. */
export async function uploadCover(file: File) {
  checkImage(file);
  if (file.type === "image/gif" || file.type === "image/svg+xml") return uploadImage(file);
  return put(await cropCover(file), "jpg", "image/jpeg");
}
