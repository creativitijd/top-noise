import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const auth = await getAuth();
  if (!auth) {
    return jsonError("Niet ingelogd.", 401);
  }
  const { id } = await context.params;
  const { error } = await auth.supabase.from("posts").update({ status: "rejected" }).eq("id", id);
  if (error) {
    return jsonError(error.message, 500);
  }
  return NextResponse.json({ ok: true });
}
