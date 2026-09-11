import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth, assertProjectAccess } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { testWordPressConnection } from "@/lib/publishers/wordpress";
import { handleRouteError, jsonError, readJson } from "@/lib/http";

const schema = z.object({
  projectId: z.string().uuid(),
  siteUrl: z.string().url(),
  username: z.string().min(1),
  appPassword: z.string().min(4),
  connect: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }
    const body = await readJson(request, schema);
    await assertProjectAccess(auth.supabase, body.projectId);

    const result = await testWordPressConnection({
      siteUrl: body.siteUrl,
      username: body.username,
      appPassword: body.appPassword,
    });
    if (!result.ok) {
      return jsonError(result.error ?? "Verbinding mislukt.");
    }

    if (body.connect) {
      const admin = createAdminSupabase();
      const { error } = await admin.from("channels").upsert(
        {
          project_id: body.projectId,
          platform: "wordpress",
          status: "connected",
          account_label: result.label ?? body.username,
          external_id: body.siteUrl,
          access_token: body.appPassword,
          meta: {
            site_url: body.siteUrl.replace(/\/$/, ""),
            username: body.username,
            app_password: body.appPassword,
          } as import("@/types/database").Json,
        },
        { onConflict: "project_id,platform" }
      );
      if (error) {
        return jsonError(error.message, 500);
      }
    }

    return NextResponse.json({ ok: true, label: result.label });
  } catch (error) {
    return handleRouteError(error);
  }
}
