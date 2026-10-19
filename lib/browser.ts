"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "./site";

// Session lives in cookies (not localStorage) so the server can check who is signed in on /admin pages.
export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_KEY);

export type Profile = { user_id: string; email: string | null; display_name: string | null; role: "admin" | "manager" | "editor" };

export function roleLabel(r: Profile["role"]) {
  return r === "admin" ? "Administrator" : r === "manager" ? "Kryeredaktor" : "Gazetar";
}
