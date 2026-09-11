import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth, assertProjectAccess } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { handleRouteError, jsonError, readJson } from "@/lib/http";
import { isPlatform } from "@/lib/platforms";

const schema = z.object({
  projectId: z.string().uuid(),
  platform: z.string(),
});

export async function POST(request: Request) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }
    const body = await readJson(request, schema);
    if (!isPlatform(body.platform)) {
      return jsonError("Onbekend platform.");
    }
    await assertProjectAccess(auth.supabase, body.projectId);
    const admin = createAdminSupabase();
    const { error } = await admin
      .from("channels")
      .update({
        status: "disconnected",
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        account_label: null,
        external_id: null,
        meta: {},
      })
      .eq("project_id", body.projectId)
      .eq("platform", body.platform);
    if (error) {
      return jsonError(error.message, 500);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
