import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth, assertProjectAccess } from "@/lib/auth/session";
import {
  AUTOMAAT_CHANNELS,
  STRATEGY_LEVELS,
  emptyConversation,
  emptyDocument,
} from "@/lib/automaat/model";
import {
  STRATEGIES_MIGRATION_HINT,
  asJson,
  estimatedSnapshotFromProject,
  missingStrategiesSchema,
  serializeStrategy,
} from "@/lib/automaat/store";
import { handleRouteError, jsonError, readJson } from "@/lib/http";

const createSchema = z.object({
  projectId: z.string().uuid(),
  level: z.enum(STRATEGY_LEVELS),
  periodMonths: z.union([z.literal(3), z.literal(6), z.literal(9)]),
  channels: z.array(z.enum(AUTOMAAT_CHANNELS)).min(1),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

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
    const { data, error } = await auth.supabase
      .from("strategies")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error) {
      return jsonError(
        missingStrategiesSchema(error.message) ? STRATEGIES_MIGRATION_HINT : error.message,
        500
      );
    }
    const row = data?.[0] ?? null;
    return NextResponse.json({ strategy: row ? serializeStrategy(row) : null });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }
    const body = await readJson(request, createSchema);
    const project = await assertProjectAccess(auth.supabase, body.projectId);
    const estimated = estimatedSnapshotFromProject(project);
    const conversation = emptyConversation(body.level);
    const document = emptyDocument();

    const { data, error } = await auth.supabase
      .from("strategies")
      .insert({
        project_id: project.id,
        status: "draft",
        level: body.level,
        period_months: body.periodMonths,
        channels: body.channels,
        starts_on: body.startsOn,
        conversation: asJson(conversation),
        document: asJson(document),
        data_snapshot: asJson({
          ...(typeof estimated.snapshot === "object" && estimated.snapshot && !Array.isArray(estimated.snapshot)
            ? estimated.snapshot
            : {}),
          text: estimated.text,
        }),
      })
      .select("*")
      .single();

    if (error || !data) {
      return jsonError(
        missingStrategiesSchema(error?.message) ? STRATEGIES_MIGRATION_HINT : (error?.message ?? "Strategie aanmaken mislukt."),
        500
      );
    }

    return NextResponse.json({ strategy: serializeStrategy(data), snapshotText: estimated.text });
  } catch (error) {
    return handleRouteError(error);
  }
}
