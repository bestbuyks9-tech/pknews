"use client";
import { supabase } from "./browser";
import type { MediaItem } from "./site";

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

/** Video formats the media bucket accepts for in-article reels. */
const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
const EXTRA_MAX_SIDE = 1600;

/** Scales a photo down so its longer side is at most EXTRA_MAX_SIDE, keeping its shape. */
async function shrinkImage(bmp: ImageBitmap): Promise<Blob> {
  const scale = Math.min(1, EXTRA_MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Shfletuesi nuk mund ta përpunojë foton.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Fotoja nuk u përpunua."))), "image/jpeg", 0.86));
}

/** Reads a video's width and height in the browser; null if it can't tell. */
function videoSize(file: File): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (r: { w: number; h: number } | null) => { URL.revokeObjectURL(url); resolve(r); };
    v.preload = "metadata";
    v.onloadedmetadata = () => done(v.videoWidth ? { w: v.videoWidth, h: v.videoHeight } : null);
    v.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
    v.src = url;
  });
}

/**
 * Uploads an extra photo or video for inside an article. Photos keep their shape (only scaled
 * down); the display mode starts as the file's own orientation and can be changed in the editor.
 */
export async function uploadExtra(file: File): Promise<MediaItem> {
  if (file.type.startsWith("video/")) {
    const ext = VIDEO_TYPES[file.type];
    if (!ext) throw new Error("Videoja duhet të jetë MP4, WEBM ose MOV.");
    if (file.size > 50 * 1024 * 1024) throw new Error("Videoja është më e madhe se 50 MB.");
    const size = await videoSize(file);
    const url = await put(file, ext, file.type);
    return { type: "video", url, mode: size && size.h > size.w ? "portrait" : "landscape" };
  }
  if (!file.type.startsWith("image/")) throw new Error("Zgjidh një foto (JPG, PNG, WEBP) ose video (MP4, WEBM, MOV).");
  checkImage(file);
  const bmp = await createImageBitmap(file);
  const mode = bmp.height > bmp.width ? "portrait" : "landscape";
  try {
    const url = file.type === "image/gif" ? await uploadImage(file) : await put(await shrinkImage(bmp), "jpg", "image/jpeg");
    return { type: "image", url, mode };
  } finally {
    bmp.close();
  }
}
