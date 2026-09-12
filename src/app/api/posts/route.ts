import { NextResponse } from "next/server";
import { z } from "zod";
import { parsedBrandAnalysis, withBrandVisualBrief } from "@/lib/ai/brand-analysis";
import { getAuth, assertProjectAccess } from "@/lib/auth/session";
import { handleRouteError, jsonError, readJson } from "@/lib/http";
import { isPlatform } from "@/lib/platforms";
import { scheduledAtForDay } from "@/lib/dates";

const createSchema = z.object({
  projectId: z.string().uuid(),
  topic: z.string().min(2),
  date: z.string().min(8),
  platforms: z.array(z.string()).min(1),
  pillarId: z.string().uuid().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }
    const body = await readJson(request, createSchema);
    const platforms = body.platforms.filter(isPlatform);
    if (platforms.length === 0) {
      return jsonError("Kies minstens één platform.");
    }
    const project = await assertProjectAccess(auth.supabase, body.projectId);
    const scheduledAt = scheduledAtForDay(body.date, project.timezone);

    const { data: post, error } = await auth.supabase
      .from("posts")
      .insert({
        project_id: project.id,
        pillar_id: body.pillarId ?? null,
        topic: body.topic,
        visual_brief: withBrandVisualBrief(
          body.topic,
          "",
          parsedBrandAnalysis(project.brand_analysis),
          project.visual_guidelines
        ),
        scheduled_at: scheduledAt,
        timezone: project.timezone,
        status: "draft",
      })
      .select("*")
      .single();
    if (error || !post) {
      return jsonError(error?.message ?? "Bericht aanmaken mislukt.", 500);
    }

    const { error: targetError } = await auth.supabase.from("post_targets").insert(
      platforms.map((platform) => ({
        post_id: post.id,
        platform,
        content: "",
        status: "draft" as const,
      }))
    );
    if (targetError) {
      return jsonError(targetError.message, 500);
    }

    return NextResponse.json({ post });
  } catch (error) {
    return handleRouteError(error);
  }
}
