import { NextResponse } from "next/server";
import { z } from "zod";
import { assertProjectAccess, getAuth } from "@/lib/auth/session";
import { nextTuneTurn } from "@/lib/automaat/conversation";
import { asJson, brandContextFromProject, loadStrategy, serializeStrategy, snapshotText } from "@/lib/automaat/store";
import { handleRouteError, jsonError, readJson } from "@/lib/http";

const schema = z.object({
  answer: z.string().min(1),
});

export const maxDuration = 60;

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
    if (strategy.conversation.done) {
      return NextResponse.json({ strategy });
    }

    const next = await nextTuneTurn({
      level: strategy.level,
      brandContext: brandContextFromProject(project),
      snapshot: snapshotText(row.data_snapshot),
      conversation: strategy.conversation,
      document: strategy.document,
      answer: body.answer,
    });

    const { data, error } = await auth.supabase
      .from("strategies")
      .update({
        conversation: asJson(next.conversation),
        document: asJson(next.document),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) {
      return jsonError(error?.message ?? "Antwoord opslaan mislukt.", 500);
    }
    return NextResponse.json({ strategy: serializeStrategy(data) });
  } catch (error) {
    return handleRouteError(error);
  }
}
