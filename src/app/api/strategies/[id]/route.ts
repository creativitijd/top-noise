import { NextResponse } from "next/server";
import { z } from "zod";
import { assertProjectAccess, getAuth } from "@/lib/auth/session";
import { strategyDocumentSchema } from "@/lib/automaat/model";
import { asJson, loadStrategy, serializeStrategy } from "@/lib/automaat/store";
import { handleRouteError, jsonError, readJson } from "@/lib/http";

const patchSchema = z.object({
  document: strategyDocumentSchema.optional(),
  confirmMonth: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }
    const { id } = await context.params;
    const { row, strategy } = await loadStrategy(auth.supabase, id);
    await assertProjectAccess(auth.supabase, row.project_id);
    return NextResponse.json({ strategy });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }
    const { id } = await context.params;
    const body = await readJson(request, patchSchema);
    const { row, strategy } = await loadStrategy(auth.supabase, id);
    await assertProjectAccess(auth.supabase, row.project_id);

    let document = body.document ?? strategy.document;
    if (body.confirmMonth) {
      document = {
        ...document,
        monthly_focus: document.monthly_focus.map((item) =>
          item.month === body.confirmMonth ? { ...item, confirmed: true } : item
        ),
      };
    }
    if (body.document || body.confirmMonth) {
      document = {
        ...document,
        version_history: [
          ...document.version_history,
          {
            date: new Date().toISOString(),
            change: body.confirmMonth ? `maand ${body.confirmMonth} bevestigd` : "strategie bijgewerkt",
            reason: "wizard",
          },
        ],
      };
    }

    const { data, error } = await auth.supabase
      .from("strategies")
      .update({
        document: asJson(document),
        status: body.status ?? row.status,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) {
      return jsonError(error?.message ?? "Opslaan mislukt.", 500);
    }
    return NextResponse.json({ strategy: serializeStrategy(data) });
  } catch (error) {
    return handleRouteError(error);
  }
}
