// Reels upload for the daily pipeline (no user login; guarded by REELS_UPLOAD_TOKEN).
//   {action:"start", slug}                    -> signed upload URLs for <slug>.mp4 and <slug>.jpg
//   {action:"publish", slug, title, ...}      -> upserts the row the /histori feed reads
// Deploy with verify_jwt = false; the token check below is the guard.
import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function same(a: string, b: string) {
  if (!a || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const secret = Deno.env.get("REELS_UPLOAD_TOKEN") || "";
  if (!secret || !same(req.headers.get("x-reels-token") || "", secret)) return json({ error: "Unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  const slug = String(body.slug || "");
  if (!/^[a-z0-9][a-z0-9-]{2,120}$/.test(slug)) return json({ error: "Bad slug" }, 400);
  const bucket = admin.storage.from("reels");

  if (body.action === "start") {
    const out: Record<string, string> = {};
    for (const ext of ["mp4", "jpg"]) {
      const { data, error } = await bucket.createSignedUploadUrl(`${slug}.${ext}`, { upsert: true });
      if (error) return json({ error: error.message }, 500);
      out[ext] = data.signedUrl;
    }
    return json({ ok: true, upload: out });
  }

  if (body.action === "publish") {
    const pub = (p: string) => bucket.getPublicUrl(p).data.publicUrl;
    const row = {
      slug,
      title: String(body.title || "").slice(0, 300),
      question: body.question ? String(body.question).slice(0, 500) : null,
      caption: body.caption ? String(body.caption).slice(0, 5000) : null,
      video_url: pub(`${slug}.mp4`),
      poster_url: pub(`${slug}.jpg`),
      duration_s: Number(body.duration_s) || null,
      facebook_url: body.facebook_url ? String(body.facebook_url) : null,
      published: body.published !== false,
      published_at: body.published_at ? String(body.published_at) : new Date().toISOString(),
    };
    if (!row.title) return json({ error: "Missing title" }, 400);
    const { error } = await admin.from("reels").upsert(row, { onConflict: "slug" });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, video_url: row.video_url });
  }

  return json({ error: "Unknown action" }, 400);
});
