import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth, assertProjectAccess } from "@/lib/auth/session";
import { generateAndAttachPostImages } from "@/lib/ai/image";
import { handleRouteError, jsonError, readJson } from "@/lib/http";

export const maxDuration = 120;

const schema = z.object({
  projectId: z.string().uuid(),
  postId: z.string().uuid(),
  topic: z.string().min(2),
  visualBrief: z.string().optional(),
  count: z.number().int().min(1).max(4).optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }
    const body = await readJson(request, schema);
    const project = await assertProjectAccess(auth.supabase, body.projectId);

    const { data: post, error: postError } = await auth.supabase
      .from("posts")
      .select("*")
      .eq("id", body.postId)
      .eq("project_id", project.id)
      .maybeSingle();
    if (postError || !post) {
      return jsonError("Bericht niet gevonden.", 404);
    }

    const visualBrief = (body.visualBrief ?? post.visual_brief ?? "").trim();
    const result = await generateAndAttachPostImages({
      supabase: auth.supabase,
      project,
      postId: post.id,
      topic: body.topic,
      visualBrief: visualBrief || body.topic,
      count: body.count ?? 4,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
