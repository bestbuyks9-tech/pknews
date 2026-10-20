// Politika Kosovare Studio — admin-only team management (create / remove staff accounts).
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Duhet të jesh i kyçur." }, 401);
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  if (whoErr || !who.user) return json({ error: "Sesioni ka skaduar. Hyr përsëri." }, 401);

  const { data: me } = await admin.from("profiles").select("role").eq("user_id", who.user.id).single();
  if (me?.role !== "admin") return json({ error: "Vetëm administratorët mund të menaxhojnë ekipin." }, 403);

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return json({ error: "Kërkesë e pavlefshme." }, 400); }

  if (body.action === "create") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const role = ["admin", "manager", "editor"].includes(body.role) ? body.role : "editor";
    if (!email.includes("@")) return json({ error: "Email i pavlefshëm." }, 400);
    if (password.length < 8) return json({ error: "Fjalëkalimi duhet të ketë të paktën 8 karaktere." }, 400);

    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
    if (error) return json({ error: error.message.includes("already") ? "Ky email është tashmë në ekip." : error.message }, 400);
    await admin.from("profiles").upsert({ user_id: data.user.id, email, display_name: name || email.split("@")[0], role });
    return json({ ok: true, user_id: data.user.id });
  }

  if (body.action === "remove") {
    if (body.user_id === who.user.id) return json({ error: "Nuk mund ta heqësh veten." }, 400);
    // This Supabase project's auth is shared with other apps: only ever delete accounts that are on the newsroom team.
    const { data: member } = await admin.from("profiles").select("user_id").eq("user_id", String(body.user_id)).maybeSingle();
    if (!member) return json({ error: "Ky person nuk është në ekip." }, 404);
    await admin.from("profiles").delete().eq("user_id", String(body.user_id));
    const { error } = await admin.auth.admin.deleteUser(String(body.user_id));
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: "Veprim i panjohur." }, 400);
});
