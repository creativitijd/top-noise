import { NextResponse } from "next/server";
import { assertProjectAccess, getAuth } from "@/lib/auth/session";
import { startTuneConversation } from "@/lib/automaat/conversation";
import { proposeStrategy } from "@/lib/automaat/propose";
import { asJson, brandContextFromProject, loadStrategy, serializeStrategy, snapshotText } from "@/lib/automaat/store";
import { projectMarket } from "@/lib/holidays";
import { handleRouteError, jsonError } from "@/lib/http";

export const maxDuration = 60;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }
    const { id } = await context.params;
    const { row, strategy } = await loadStrategy(auth.supabase, id);
    const project = await assertProjectAccess(auth.supabase, row.project_id);
    if (strategy.document.pillars.length > 0) {
      return NextResponse.json({ strategy });
    }

    const document = await proposeStrategy({
      projectName: project.name,
      level: strategy.level,
      periodMonths: strategy.period_months,
      startsOn: strategy.starts_on,
      channels: strategy.channels,
      brandContext: brandContextFromProject(project),
      conversation: strategy.conversation,
      snapshotText: snapshotText(row.data_snapshot),
      country: projectMarket(project).country,
      region: projectMarket(project).region,
    });
    const conversation = strategy.conversation.done
      ? strategy.conversation
      : startTuneConversation(document, strategy.level);

    const { data, error } = await auth.supabase
      .from("strategies")
      .update({
        document: asJson(document),
        conversation: asJson(conversation),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) {
      return jsonError(error?.message ?? "Voorstel opslaan mislukt.", 500);
    }
    return NextResponse.json({ strategy: serializeStrategy(data) });
  } catch (error) {
    return handleRouteError(error);
  }
}
