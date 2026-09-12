import { NextResponse } from "next/server";
import { z } from "zod";
import { assertProjectAccess, getAuth } from "@/lib/auth/session";
import { googleOAuthConfigured } from "@/lib/env";
import { asJson } from "@/lib/automaat/store";
import {
  DATA_SOURCES_MIGRATION_HINT,
  listCandidatesFor,
  loadDataSources,
  missingDataSourcesSchema,
  refreshSourceSnapshot,
  toPublicSource,
} from "@/lib/google/sources";
import { handleRouteError, jsonError, readJson } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }
    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) {
      return jsonError("Project ontbreekt.");
    }
    await assertProjectAccess(auth.supabase, projectId);
    const rows = await loadDataSources(auth.supabase, projectId);
    return NextResponse.json({
      configured: googleOAuthConfigured(),
      ga4: toPublicSource(rows.find((row) => row.provider === "ga4") ?? null, "ga4"),
      gsc: toPublicSource(rows.find((row) => row.provider === "gsc") ?? null, "gsc"),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

const patchSchema = z.object({
  projectId: z.string().uuid(),
  provider: z.enum(["ga4", "gsc"]),
  action: z.enum(["select", "refresh", "disconnect"]),
  externalId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }
    const body = await readJson(request, patchSchema);
    await assertProjectAccess(auth.supabase, body.projectId);
    const rows = await loadDataSources(auth.supabase, body.projectId);
    const row = rows.find((item) => item.provider === body.provider) ?? null;

    if (body.action === "disconnect") {
      if (row) {
        const { error } = await auth.supabase
          .from("project_data_sources")
          .update({
            status: "disconnected",
            account_label: null,
            external_id: null,
            access_token: null,
            refresh_token: null,
            token_expires_at: null,
            snapshot: null,
            snapshot_at: null,
            last_error: null,
            meta: {},
          })
          .eq("id", row.id);
        if (error) {
          return jsonError(
            missingDataSourcesSchema(error.message) ? DATA_SOURCES_MIGRATION_HINT : error.message,
            500
          );
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (!row) {
      return jsonError("Koppel Google eerst.");
    }

    if (body.action === "select") {
      if (!body.externalId) {
        return jsonError("Kies een property of site.");
      }
      const candidates = await listCandidatesFor(auth.supabase, row);
      const chosen = candidates.find((item) => item.id === body.externalId);
      if (!chosen) {
        return jsonError("Die property of site hoort niet bij dit Google-account.");
      }
      const { data: updated, error } = await auth.supabase
        .from("project_data_sources")
        .update({
          external_id: chosen.id,
          account_label: chosen.name,
          status: "connected",
          last_error: null,
          meta: asJson({ candidates }),
        })
        .eq("id", row.id)
        .select("*")
        .single();
      if (error || !updated) {
        return jsonError(error?.message ?? "Selectie opslaan mislukt.", 500);
      }
      await refreshSourceSnapshot(auth.supabase, updated);
      return NextResponse.json({ ok: true });
    }

    await refreshSourceSnapshot(auth.supabase, row);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
