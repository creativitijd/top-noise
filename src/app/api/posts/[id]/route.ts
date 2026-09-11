import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth/session";
import { handleRouteError, jsonError, readJson } from "@/lib/http";
import { isPlatform } from "@/lib/platforms";

const updateSchema = z.object({
  topic: z.string().optional(),
  title: z.string().optional(),
  explanation: z.string().optional(),
  visualBrief: z.string().optional(),
  scheduledAt: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  targets: z
    .array(
      z.object({
        platform: z.string(),
        content: z.string(),
        hashtags: z.array(z.string()).optional(),
      })
    )
    .optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }
    const { id } = await context.params;
    const body = await readJson(request, updateSchema);

    const { data: post, error } = await auth.supabase
      .from("posts")
      .update({
        topic: body.topic,
        title: body.title,
        explanation: body.explanation,
        visual_brief: body.visualBrief,
        scheduled_at: body.scheduledAt,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !post) {
      return jsonError(error?.message ?? "Bericht niet gevonden.", 404);
    }

    if (body.targets) {
      for (const target of body.targets) {
        if (!isPlatform(target.platform)) {
          continue;
        }
        await auth.supabase
          .from("post_targets")
          .update({
            content: target.content,
            hashtags: target.hashtags ?? [],
          })
          .eq("post_id", id)
          .eq("platform", target.platform);
      }
    }

    if (body.imageUrl !== undefined) {
      await auth.supabase.from("media").delete().eq("post_id", id).is("platform", null);
      if (body.imageUrl) {
        await auth.supabase.from("media").insert({
          project_id: post.project_id,
          post_id: id,
          public_url: body.imageUrl,
        });
      }
    }

    return NextResponse.json({ post });
  } catch (error) {
    return handleRouteError(error);
  }
}
