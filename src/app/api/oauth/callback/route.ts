import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { parseOAuthState } from "@/lib/oauth/state";
import { exchangeOAuthCode } from "@/lib/oauth/providers";
import { appUrl } from "@/lib/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateValue = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error || !code || !stateValue) {
    return NextResponse.redirect(
      `${appUrl()}/projects?oauth=error&reason=${encodeURIComponent(error ?? "missing_code")}`
    );
  }

  try {
    const state = parseOAuthState(stateValue);
    if (state.platform === "wordpress") {
      throw new Error("WordPress gebruikt geen OAuth.");
    }
    const credentials = await exchangeOAuthCode(state.platform, code);
    const admin = createAdminSupabase();
    const { error: upsertError } = await admin.from("channels").upsert(
      {
        project_id: state.projectId,
        platform: state.platform,
        status: "connected",
        account_label: credentials.accountLabel ?? null,
        external_id: credentials.externalId ?? null,
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken ?? null,
        token_expires_at: credentials.tokenExpiresAt ?? null,
        meta: credentials.meta as import("@/types/database").Json,
      },
      { onConflict: "project_id,platform" }
    );
    if (upsertError) {
      throw new Error(upsertError.message);
    }

    const { data: project } = await admin
      .from("projects")
      .select("slug")
      .eq("id", state.projectId)
      .single();
    return NextResponse.redirect(
      `${appUrl()}/projects/${project?.slug ?? ""}/channels?oauth=success`
    );
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "oauth_failed";
    return NextResponse.redirect(
      `${appUrl()}/projects?oauth=error&reason=${encodeURIComponent(message)}`
    );
  }
}
