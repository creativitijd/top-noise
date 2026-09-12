import { NextResponse } from "next/server";
import { z } from "zod";
import { assertProjectAccess, getAuth } from "@/lib/auth/session";
import { generateStrategyCalendar } from "@/lib/automaat/calendar";
import { strategyDocumentSchema } from "@/lib/automaat/model";
import { asJson, loadStrategy, parseDocument, serializeStrategy } from "@/lib/automaat/store";
import { handleRouteError, jsonError, readJson } from "@/lib/http";

export const maxDuration = 120;

const schema = z.object({
  document: strategyDocumentSchema.optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }
    const { id } = await context.params;
    const body = await readJson(request, schema);
    const { row, strategy } = await loadStrategy(auth.supabase, id);
    const project = await assertProjectAccess(auth.supabase, row.project_id);
    const document = body.document ? parseDocument(body.document) : strategy.document;
    if (document.pillars.length === 0) {
      return jsonError("Maak eerst een strategievoorstel.");
    }

    const result = await generateStrategyCalendar({
      supabase: auth.supabase,
      project,
      strategyId: id,
      level: strategy.level,
      startsOn: strategy.starts_on,
      periodMonths: strategy.period_months,
      channels: strategy.channels,
      document,
    });

    const nextDocument = {
      ...document,
      version_history: [
        ...document.version_history,
        {
          date: new Date().toISOString(),
          change: `${result.created} concepten gepland, ${result.written} uitgeschreven`,
          reason: "kalender gegenereerd",
        },
      ],
    };

    const { data, error } = await auth.supabase
      .from("strategies")
      .update({
        document: asJson(nextDocument),
        status: "active",
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) {
      return jsonError(error?.message ?? "Kalender klaar, strategie-status bijwerken mislukt.", 500);
    }

    return NextResponse.json({
      strategy: serializeStrategy(data),
      created: result.created,
      written: result.written,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
