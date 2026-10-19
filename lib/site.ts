export const SITE = {
  name: "Politika Kosovare",
  tagline: "Lajme nga Kosova dhe bota",
  description: "Politika Kosovare — lajme nga Kosova dhe bota, të qarta, të shpejta dhe pa zhurmë.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.politikakosovare.com",
};

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hsamxerpalcjzzddgyiq.supabase.co";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_564LLK4MbolZAPqykqtJGw_Yef_fXXH";

export const CATEGORIES = [
  { slug: "kosova", label: "Kosova", hue: "#c8102e" },
  { slug: "politike", label: "Politikë", hue: "#1f3a93" },
  { slug: "ekonomi", label: "Ekonomi", hue: "#0b6e4f" },
  { slug: "bota", label: "Bota", hue: "#0b5cad" },
  { slug: "sport", label: "Sport", hue: "#b54708" },
  { slug: "teknologji", label: "Teknologji", hue: "#6b21a8" },
  { slug: "kulture", label: "Kulturë", hue: "#a3195b" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export function category(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug) ?? { slug, label: slug, hue: "#c8102e" };
}

export type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  cover_url: string | null;
  cover_alt: string | null;
  featured: boolean;
  status: "draft" | "review" | "published";
  author_id: string | null;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("sq-AL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Belgrade" }).format(new Date(iso));
}

export function timeAgo(iso: string | null) {
  if (!iso) return "";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "tani";
  if (mins < 60) return `${mins} min më parë`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} orë më parë`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} ditë më parë`;
  return formatDate(iso);
}

export function readingTime(html: string) {
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/ë/g, "e").replace(/ç/g, "c")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
