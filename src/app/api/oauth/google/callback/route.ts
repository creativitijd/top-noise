import { NextResponse } from "next/server";
import { appUrl } from "@/lib/env";
import { exchangeGoogleCode, parseGoogleOAuthState } from "@/lib/google/oauth";
import { listGa4Properties, listGscSites } from "@/lib/google/snapshot";
import { asJson } from "@/lib/automaat/store";
import { refreshSourceSnapshot } from "@/lib/google/sources";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateValue = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const origin = appUrl();

  if (error || !code || !stateValue) {
    return NextResponse.redirect(
      `${origin}/projects?google=error&reason=${encodeURIComponent(error ?? "missing_code")}`
    );
  }

  let returnTo = "/projects";
  try {
    const state = parseGoogleOAuthState(stateValue);
    returnTo = state.returnTo;
    const tokens = await exchangeGoogleCode(code);
    const admin = createAdminSupabase();
    const { data: existing } = await admin
      .from("project_data_sources")
      .select("*")
      .eq("project_id", state.projectId)
      .eq("provider", state.provider)
      .maybeSingle();

    const refreshToken = tokens.refreshToken ?? existing?.refresh_token ?? null;
    if (!refreshToken) {
      throw new Error("Google gaf geen refresh token. Zet het consent-scherm op In production en koppel opnieuw.");
    }

    const candidates =
      state.provider === "ga4"
        ? await listGa4Properties(tokens.accessToken)
        : await listGscSites(tokens.accessToken);

    const auto = candidates.length === 1 ? candidates[0] : null;
    const upsert = {
      project_id: state.projectId,
      provider: state.provider,
      status: candidates.length === 0 ? ("error" as const) : ("connected" as const),
      account_label: auto?.name ?? (state.provider === "ga4" ? "Google Analytics" : "Search Console"),
      external_id: auto?.id ?? null,
      access_token: tokens.accessToken,
      refresh_token: refreshToken,
      token_expires_at: tokens.tokenExpiresAt,
      meta: asJson({ candidates, scope: tokens.scope }),
      last_error: candidates.length === 0 ? "Geen property of site gevonden voor dit Google-account." : null,
    };

    const { data: row, error: upsertError } = await admin
      .from("project_data_sources")
      .upsert(upsert, { onConflict: "project_id,provider" })
      .select("*")
      .single();
    if (upsertError || !row) {
      throw new Error(upsertError?.message ?? "Koppeling opslaan mislukt.");
    }

    if (auto) {
      try {
        await refreshSourceSnapshot(admin, row);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Snapshot ophalen mislukt.";
        await admin.from("project_data_sources").update({ last_error: message }).eq("id", row.id);
      }
    }

    const pick = auto ? "" : "&pick=1";
    return NextResponse.redirect(
      `${origin}${state.returnTo}?google=connected&provider=${state.provider}${pick}`
    );
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "oauth_failed";
    return NextResponse.redirect(`${origin}${returnTo}?google=error&reason=${encodeURIComponent(message)}`);
  }
}
