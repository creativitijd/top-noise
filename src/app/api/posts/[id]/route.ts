import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth/session";
import { handleRouteError, jsonError, readJson } from "@/lib/http";
import { isPlatform, type Platform } from "@/lib/platforms";

const updateSchema = z.object({
  topic: z.string().optional(),
  title: z.string().optional(),
  explanation: z.string().optional(),
  visualBrief: z.string().optional(),
  scheduledAt: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  addPlatforms: z.array(z.string()).optional(),
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

    const patch = {
      topic: body.topic,
      title: body.title,
      explanation: body.explanation,
      visual_brief: body.visualBrief,
      scheduled_at: body.scheduledAt,
    };
    const shouldUpdatePost = Object.values(patch).some((value) => value !== undefined);

    const { data: post, error } = shouldUpdatePost
      ? await auth.supabase.from("posts").update(patch).eq("id", id).select("*").single()
      : await auth.supabase.from("posts").select("*").eq("id", id).single();
    if (error || !post) {
      return jsonError(error?.message ?? "Bericht niet gevonden.", 404);
    }

    if (body.addPlatforms) {
      const { data: existing } = await auth.supabase.from("post_targets").select("platform").eq("post_id", id);
      const have = new Set((existing ?? []).map((row) => row.platform));
      const rows = body.addPlatforms
        .filter((platform): platform is Platform => isPlatform(platform) && !have.has(platform))
        .map((platform) => ({
          post_id: id,
          platform,
          content: "",
          hashtags: [] as string[],
          status: "draft" as const,
        }));
      if (rows.length > 0) {
        const { error: insertError } = await auth.supabase.from("post_targets").insert(rows);
        if (insertError) {
          return jsonError(insertError.message, 400);
        }
      }
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
