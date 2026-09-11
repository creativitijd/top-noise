import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth, ensureOrganization } from "@/lib/auth/session";
import { handleRouteError, jsonError, readJson } from "@/lib/http";

const schema = z.object({
  platform: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }
    const body = await readJson(request, schema);
    const organizationId = await ensureOrganization(auth.supabase);
    const { error } = await auth.supabase.from("platform_interest").upsert(
      {
        organization_id: organizationId,
        platform: body.platform,
      },
      { onConflict: "organization_id,platform" }
    );
    if (error) {
      return jsonError(error.message, 500);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
