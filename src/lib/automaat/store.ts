import { formatStoredAnalysis } from "@/lib/ai/brand-analysis";
import { parseConversation } from "@/lib/automaat/conversation";
import {
  STRATEGY_LEVELS,
  emptyDocument,
  strategyDocumentSchema,
  type StrategyDocument,
  type StrategyLevel,
  type StrategyRecord,
} from "@/lib/automaat/model";
import type { Authed } from "@/lib/auth/session";
import type { Json, Project, Strategy } from "@/types/database";

export const STRATEGIES_MIGRATION_HINT =
  "Draai in Supabase → SQL Editor het bestand supabase/migrations/0003_strategies.sql en klik daarna Run.";

export function missingStrategiesSchema(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  const lower = message.toLowerCase();
  return (
    (lower.includes("strategies") &&
      (lower.includes("schema cache") ||
        lower.includes("does not exist") ||
        lower.includes("could not find") ||
        lower.includes("relation"))) ||
    (lower.includes("strategy_id") && lower.includes("schema cache"))
  );
}

export function asJson<T>(value: T): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export function parseDocument(value: unknown): StrategyDocument {
  const parsed = strategyDocumentSchema.safeParse(value);
  return parsed.success ? parsed.data : emptyDocument();
}

export function serializeStrategy(row: Strategy): StrategyRecord {
  const level = STRATEGY_LEVELS.includes(row.level as StrategyLevel)
    ? (row.level as StrategyLevel)
    : "normaal";
  const periodMonths = row.period_months === 6 || row.period_months === 9 ? row.period_months : 3;
  return {
    id: row.id,
    project_id: row.project_id,
    status: row.status,
    level,
    period_months: periodMonths,
    channels: row.channels ?? [],
    starts_on: row.starts_on,
    conversation: parseConversation(row.conversation),
    document: parseDocument(row.document),
    data_snapshot: row.data_snapshot,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function loadStrategy(
  supabase: Authed["supabase"],
  id: string
): Promise<{ row: Strategy; strategy: StrategyRecord }> {
  const { data, error } = await supabase.from("strategies").select("*").eq("id", id).maybeSingle();
  if (error) {
    throw new Error(missingStrategiesSchema(error.message) ? STRATEGIES_MIGRATION_HINT : error.message);
  }
  if (!data) {
    throw new Error("Strategie niet gevonden.");
  }
  return { row: data, strategy: serializeStrategy(data) };
}

export function brandContextFromProject(project: Project): string {
  return [
    `Merk: ${project.name}`,
    project.industry ? `Branche: ${project.industry}` : null,
    project.target_audience ? `Doelgroep: ${project.target_audience}` : null,
    project.goals ? `Doelen: ${project.goals}` : null,
    project.tone_of_voice ? `Toon: ${project.tone_of_voice}` : null,
    formatStoredAnalysis(project.brand_analysis),
  ]
    .filter(Boolean)
    .join("\n");
}

export function estimatedSnapshotFromProject(project: Project): { snapshot: Json; text: string } {
  const analysisText = formatStoredAnalysis(project.brand_analysis);
  const snapshot = {
    source: "schatting",
    website_url: project.website_url,
    industry: project.industry,
    audience: project.target_audience,
    goals: project.goals,
    note: "Geen GA4 of Search Console gekoppeld. Nulmetingen zijn schattingen op basis van merk en website.",
  };
  const text = [
    "Bron: schatting (geen GA4/GSC).",
    project.website_url ? `Website: ${project.website_url}` : null,
    project.industry ? `Branche: ${project.industry}` : null,
    project.target_audience ? `Doelgroep: ${project.target_audience}` : null,
    project.goals ? `Doelen: ${project.goals}` : null,
    analysisText,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { snapshot: asJson(snapshot), text };
}

export function snapshotText(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.text === "string" && record.text.trim()) {
    return record.text;
  }
  if (typeof record.note === "string") {
    return [
      record.source === "schatting" ? "Bron: schatting (geen GA4/GSC)." : null,
      record.website_url ? `Website: ${record.website_url}` : null,
      record.note,
    ]
      .filter(Boolean)
      .join("\n");
  }
  return JSON.stringify(value);
}
