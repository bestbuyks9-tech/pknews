import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL, type Post } from "./site";

const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const LIST = "id,title,slug,excerpt,category,cover_url,cover_alt,featured,status,author_name,published_at,created_at,updated_at,body";

function safe(posts: unknown): Post[] {
  return Array.isArray(posts) ? (posts as Post[]) : [];
}

export async function latestPosts(limit = 30, cat?: string) {
  let q = db.from("posts").select(LIST).eq("status", "published").order("published_at", { ascending: false }).limit(limit);
  if (cat) q = q.eq("category", cat);
  const { data, error } = await q;
  if (error) console.error("Orbita: posts failed", error.message);
  return safe(data);
}

export async function postBySlug(slug: string) {
  const { data } = await db.from("posts").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return (data as Post) ?? null;
}

export async function searchPosts(term: string) {
  const t = term.replace(/[%,()]/g, " ").trim();
  if (!t) return [];
  const { data } = await db
    .from("posts")
    .select(LIST)
    .eq("status", "published")
    .or(`title.ilike.%${t}%,excerpt.ilike.%${t}%`)
    .order("published_at", { ascending: false })
    .limit(30);
  return safe(data);
}
