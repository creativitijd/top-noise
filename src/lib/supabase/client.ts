import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase-omgeving is niet geconfigureerd.");
  }
  return createBrowserClient<Database>(url, anonKey);
}
