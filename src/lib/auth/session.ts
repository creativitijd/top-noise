import { createServerSupabase } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Project } from "@/types/database";

export type Authed = {
  supabase: SupabaseClient<Database>;
  user: User;
};

export async function getAuth(): Promise<Authed | null> {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }
    return { supabase, user };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<Authed> {
  const auth = await getAuth();
  if (!auth) {
    throw new Error("UNAUTHORIZED");
  }
  return auth;
}

export async function ensureOrganization(supabase: Authed["supabase"]): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_personal_organization");
  if (error || !data) {
    throw new Error(error?.message ?? "Workspace aanmaken mislukt.");
  }
  return data;
}

export async function getProjectBySlug(
  supabase: Authed["supabase"],
  slug: string
): Promise<Project | null> {
  const { data, error } = await supabase.from("projects").select("*").eq("slug", slug).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function assertProjectAccess(
  supabase: Authed["supabase"],
  projectId: string
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (error || !data) {
    throw new Error("Geen toegang tot dit project.");
  }
  return data;
}
