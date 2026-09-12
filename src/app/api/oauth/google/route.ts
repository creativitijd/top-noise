import { NextResponse } from "next/server";
import { assertProjectAccess, getAuth } from "@/lib/auth/session";
import { googleOAuthConfigured } from "@/lib/env";
import { createGoogleOAuthState, googleAuthorizeUrl, safeReturnTo } from "@/lib/google/oauth";
import { jsonError } from "@/lib/http";
import type { DataSourceProvider } from "@/types/database";

export async function GET(request: Request) {
  const auth = await getAuth();
  if (!auth) {
    return jsonError("Niet ingelogd.", 401);
  }
  if (!googleOAuthConfigured()) {
    return jsonError("Google OAuth is nog niet geconfigureerd op de server.");
  }
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const provider = url.searchParams.get("provider");
  if (!projectId) {
    return jsonError("projectId ontbreekt.");
  }
  if (provider !== "ga4" && provider !== "gsc") {
    return jsonError("Kies ga4 of gsc.");
  }
  await assertProjectAccess(auth.supabase, projectId);

  const { data: project } = await auth.supabase.from("projects").select("slug").eq("id", projectId).maybeSingle();
  const fallback = project?.slug ? `/projects/${project.slug}/settings` : "/projects";
  const returnTo = safeReturnTo(url.searchParams.get("returnTo") ?? fallback);
  const state = createGoogleOAuthState({
    projectId,
    userId: auth.user.id,
    provider: provider as DataSourceProvider,
    returnTo,
  });
  return NextResponse.redirect(googleAuthorizeUrl(state, provider));
}
