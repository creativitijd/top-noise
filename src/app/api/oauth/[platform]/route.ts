import { NextResponse } from "next/server";
import { getAuth, assertProjectAccess } from "@/lib/auth/session";
import { createOAuthState } from "@/lib/oauth/state";
import { getAuthorizeUrl } from "@/lib/oauth/providers";
import { jsonError } from "@/lib/http";
import { isPlatform } from "@/lib/platforms";

type RouteContext = { params: Promise<{ platform: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await getAuth();
  if (!auth) {
    return jsonError("Niet ingelogd.", 401);
  }
  const { platform } = await context.params;
  if (!isPlatform(platform) || platform === "wordpress") {
    return jsonError("Dit platform ondersteunt geen OAuth.");
  }
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return jsonError("projectId ontbreekt.");
  }
  await assertProjectAccess(auth.supabase, projectId);

  const state = createOAuthState({
    projectId,
    platform,
    userId: auth.user.id,
  });
  const url = getAuthorizeUrl(platform, state);
  return NextResponse.redirect(url);
}
