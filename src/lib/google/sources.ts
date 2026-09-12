import { refreshGoogleAccessToken } from "@/lib/google/oauth";
import {
  fetchGa4Snapshot,
  fetchGscSnapshot,
  formatDataSnapshotText,
  listGa4Properties,
  listGscSites,
  snapshotToJson,
  type Ga4Snapshot,
  type GscSnapshot,
} from "@/lib/google/snapshot";
import { asJson, estimatedSnapshotFromProject } from "@/lib/automaat/store";
import type { Authed } from "@/lib/auth/session";
import type { DataSourcePublic, SnapshotCandidate } from "@/lib/google/types";
import type { Json, Project, ProjectDataSource } from "@/types/database";

export type { DataSourcePublic, SnapshotCandidate } from "@/lib/google/types";

export const DATA_SOURCES_MIGRATION_HINT =
  "Draai in Supabase → SQL Editor het bestand supabase/migrations/0004_data_sources.sql en klik daarna Run.";

export function missingDataSourcesSchema(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes("project_data_sources") &&
    (lower.includes("schema cache") ||
      lower.includes("does not exist") ||
      lower.includes("could not find") ||
      lower.includes("relation"))
  );
}

export function toPublicSource(row: ProjectDataSource | null, provider: "ga4" | "gsc"): DataSourcePublic {
  if (!row) {
    return {
      provider,
      status: "disconnected",
      accountLabel: null,
      externalId: null,
      snapshotAt: null,
      lastError: null,
      candidates: [],
    };
  }
  const meta = asRecord(row.meta);
  const candidates = Array.isArray(meta.candidates)
    ? (meta.candidates as SnapshotCandidate[]).filter((item) => item && typeof item.id === "string")
    : [];
  return {
    provider,
    status: row.status,
    accountLabel: row.account_label,
    externalId: row.external_id,
    snapshotAt: row.snapshot_at,
    lastError: row.last_error,
    candidates,
  };
}

export async function getValidAccessToken(
  supabase: Authed["supabase"],
  row: ProjectDataSource
): Promise<string> {
  if (!row.access_token) {
    throw new Error("Geen Google-token. Koppel opnieuw.");
  }
  const expires = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  if (expires > Date.now() + 60_000) {
    return row.access_token;
  }
  if (!row.refresh_token) {
    await supabase
      .from("project_data_sources")
      .update({ status: "expired", last_error: "Refresh token ontbreekt. Koppel Google opnieuw." })
      .eq("id", row.id);
    throw new Error("Google-koppeling is verlopen. Koppel opnieuw.");
  }
  try {
    const tokens = await refreshGoogleAccessToken(row.refresh_token);
    await supabase
      .from("project_data_sources")
      .update({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken ?? row.refresh_token,
        token_expires_at: tokens.tokenExpiresAt,
        status: "connected",
        last_error: null,
      })
      .eq("id", row.id);
    return tokens.accessToken;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token vernieuwen mislukt.";
    await supabase
      .from("project_data_sources")
      .update({ status: "expired", last_error: message })
      .eq("id", row.id);
    throw new Error("Google-koppeling is verlopen. Koppel opnieuw.");
  }
}

export async function loadDataSources(
  supabase: Authed["supabase"],
  projectId: string
): Promise<ProjectDataSource[]> {
  const { data, error } = await supabase.from("project_data_sources").select("*").eq("project_id", projectId);
  if (error) {
    throw new Error(missingDataSourcesSchema(error.message) ? DATA_SOURCES_MIGRATION_HINT : error.message);
  }
  return data ?? [];
}

export async function refreshSourceSnapshot(
  supabase: Authed["supabase"],
  row: ProjectDataSource
): Promise<ProjectDataSource> {
  const token = await getValidAccessToken(supabase, row);
  if (!row.external_id) {
    throw new Error(row.provider === "ga4" ? "Kies eerst een GA4-property." : "Kies eerst een Search Console-site.");
  }
  const snapshot =
    row.provider === "ga4"
      ? await fetchGa4Snapshot(token, row.external_id, row.account_label ?? row.external_id)
      : await fetchGscSnapshot(token, row.external_id);
  const { data, error } = await supabase
    .from("project_data_sources")
    .update({
      snapshot: snapshotToJson(snapshot),
      snapshot_at: new Date().toISOString(),
      status: "connected",
      last_error: null,
    })
    .eq("id", row.id)
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Snapshot opslaan mislukt.");
  }
  return data;
}

export async function listCandidatesFor(
  supabase: Authed["supabase"],
  row: ProjectDataSource
): Promise<SnapshotCandidate[]> {
  const token = await getValidAccessToken(supabase, row);
  return row.provider === "ga4" ? listGa4Properties(token) : listGscSites(token);
}

export async function strategySnapshotFromSources(
  supabase: Authed["supabase"],
  project: Project
): Promise<{ snapshot: Json; text: string }> {
  const estimated = estimatedSnapshotFromProject(project);
  let sources: ProjectDataSource[] = [];
  try {
    sources = await loadDataSources(supabase, project.id);
  } catch {
    return estimated;
  }

  const connected = sources.filter((row) => row.status === "connected" && row.external_id);
  if (connected.length === 0) {
    return estimated;
  }

  const fresh = await Promise.all(
    connected.map(async (row) => {
      const age = row.snapshot_at ? Date.now() - new Date(row.snapshot_at).getTime() : Number.POSITIVE_INFINITY;
      if (row.snapshot && age < 7 * 24 * 60 * 60 * 1000) {
        return row;
      }
      try {
        return await refreshSourceSnapshot(supabase, row);
      } catch {
        return row;
      }
    })
  );

  const ga4Row = fresh.find((row) => row.provider === "ga4");
  const gscRow = fresh.find((row) => row.provider === "gsc");
  const ga4 = parseGa4(ga4Row?.snapshot);
  const gsc = parseGsc(gscRow?.snapshot);
  const text = formatDataSnapshotText({ brand: project.name, ga4, gsc });
  if (!text) {
    return estimated;
  }

  const sourcesUsed = [ga4 ? "ga4" : null, gsc ? "gsc" : null].filter(Boolean).join("+") || "schatting";
  return {
    snapshot: asJson({
      source: sourcesUsed,
      captured_at: new Date().toISOString(),
      ga4: ga4 ?? null,
      gsc: gsc ?? null,
      text,
    }),
    text,
  };
}

function asRecord(value: Json | null): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function parseGa4(value: Json | null | undefined): Ga4Snapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.propertyId !== "string") {
    return null;
  }
  return record as unknown as Ga4Snapshot;
}

function parseGsc(value: Json | null | undefined): GscSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.siteUrl !== "string") {
    return null;
  }
  return record as unknown as GscSnapshot;
}
