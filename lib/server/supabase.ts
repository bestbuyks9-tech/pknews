import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/site";

/** Supabase client acting as the signed-in Studio user (session read from cookies). */
export async function userSupabase() {
  const jar = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        // Server components can't write cookies; middleware.ts keeps the session fresh instead.
        try { list.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch {}
      },
    },
  });
}

export type AdminCheck =
  | { ok: true; userId: string; db: Awaited<ReturnType<typeof userSupabase>> }
  | { ok: false; status: 401 | 403 };

/** Server-side admin gate for /admin pages and /api/admin routes: a verified session and profiles.role = 'admin'. */
export async function requireAdmin(): Promise<AdminCheck> {
  const db = await userSupabase();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, status: 401 };
  const { data: me } = await db.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
  if (me?.role !== "admin") return { ok: false, status: 403 };
  return { ok: true, userId: user.id, db };
}
