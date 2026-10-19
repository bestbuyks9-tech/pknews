import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./site";

export type Reel = {
  id: string;
  slug: string;
  title: string;
  question: string | null;
  caption: string | null;
  video_url: string;
  poster_url: string | null;
  duration_s: number | null;
  facebook_url: string | null;
  published_at: string;
};

const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

export async function latestReels(limit = 60) {
  const { data, error } = await db
    .from("reels")
    .select("id,slug,title,question,caption,video_url,poster_url,duration_s,facebook_url,published_at")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) console.error("Politika Kosovare: reels failed", error.message);
  return Array.isArray(data) ? (data as Reel[]) : [];
}
