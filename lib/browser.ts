"use client";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./site";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export type Profile = { user_id: string; email: string | null; display_name: string | null; role: "admin" | "manager" | "editor" };

export function roleLabel(r: Profile["role"]) {
  return r === "admin" ? "Administrator" : r === "manager" ? "Kryeredaktor" : "Gazetar";
}
