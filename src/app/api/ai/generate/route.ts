import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth, assertProjectAccess } from "@/lib/auth/session";
import { generateJsonContent } from "@/lib/ai/generate";
import {
  formatStoredAnalysis,
  formatVisualIdentity,
  parsedBrandAnalysis,
  withBrandVisualBrief,
} from "@/lib/ai/brand-analysis";
import { generateAndAttachPostImages } from "@/lib/ai/image";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import { voiceFromStored } from "@/lib/ai/voice";
import { handleRouteError, jsonError, readJson } from "@/lib/http";
import { isPlatform, type Platform } from "@/lib/platforms";
import { scheduledAtForDay } from "@/lib/dates";

export const maxDuration = 120;

const schema = z.object({
  projectId: z.string().uuid(),
  postId: z.string().uuid().optional(),
  topic: z.string().min(2),
  platforms: z.array(z.string()).min(1),
  date: z.string().optional(),
  pillarId: z.string().uuid().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }
    const body = await readJson(request, schema);
    const platforms = body.platforms.filter(isPlatform);
    if (platforms.length === 0) {
      return jsonError("Kies minstens één platform.");
    }

    const project = await assertProjectAccess(auth.supabase, body.projectId);
    const analysis = parsedBrandAnalysis(project.brand_analysis);
    const visualIdentity = formatVisualIdentity(analysis, project.visual_guidelines);
    const { data: pillars } = await auth.supabase
      .from("content_pillars")
      .select("*")
      .eq("project_id", project.id);

    const generated = await generateJsonContent({
      systemPrompt: buildSystemPrompt({
        projectName: project.name,
        industry: project.industry,
        toneOfVoice: project.tone_of_voice,
        targetAudience: project.target_audience,
        goals: project.goals,
        visualGuidelines: project.visual_guidelines,
        visualIdentity,
        brandAnalysis: formatStoredAnalysis(project.brand_analysis),
        pillars: pillars ?? [],
        voice: voiceFromStored(project.brand_analysis, project.tone_of_voice),
      }),
      userPrompt: buildUserPrompt({
        topic: body.topic,
        platforms,
        scheduledAt: body.date ?? new Date().toISOString(),
      }),
    });
    generated.visualBrief = withBrandVisualBrief(
      body.topic,
      generated.visualBrief,
      analysis,
      project.visual_guidelines
    );

    let postId = body.postId;
    if (!postId) {
      const scheduledAt = scheduledAtForDay(
        body.date ?? new Date().toISOString(),
        project.timezone
      );
      const { data: post, error } = await auth.supabase
        .from("posts")
        .insert({
          project_id: project.id,
          pillar_id: body.pillarId ?? null,
          topic: body.topic,
          title: generated.title,
          explanation: generated.explanation,
          visual_brief: generated.visualBrief,
          scheduled_at: scheduledAt,
          timezone: project.timezone,
          status: "draft",
        })
        .select("*")
        .single();
      if (error || !post) {
        return jsonError(error?.message ?? "Bericht aanmaken mislukt.", 500);
      }
      postId = post.id;
      await auth.supabase.from("post_targets").insert(
        platforms.map((platform) => ({
          post_id: post.id,
          platform,
          content: contentFor(generated.platforms, platform),
          hashtags: generated.hashtags,
          status: "draft" as const,
        }))
      );
    } else {
      const { data: existing, error } = await auth.supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();
      if (error || !existing) {
        return jsonError("Bericht niet gevonden.", 404);
      }
      await auth.supabase
        .from("posts")
        .update({
          topic: body.topic,
          title: generated.title,
          explanation: generated.explanation,
          visual_brief: generated.visualBrief,
          status: "draft",
        })
        .eq("id", postId);

      const { data: existingTargets } = await auth.supabase
        .from("post_targets")
        .select("*")
        .eq("post_id", postId);

      for (const platform of platforms) {
        const content = contentFor(generated.platforms, platform);
        const current = existingTargets?.find((target) => target.platform === platform);
        if (current) {
          await auth.supabase
            .from("post_targets")
            .update({
              content,
              hashtags: generated.hashtags,
              status: "draft",
              last_error: null,
            })
            .eq("id", current.id);
        } else {
          await auth.supabase.from("post_targets").insert({
            post_id: postId,
            platform,
            content,
            hashtags: generated.hashtags,
            status: "draft",
          });
        }
      }
    }

    if (platforms.includes("wordpress") && postId) {
      const { data: media } = await auth.supabase.from("media").select("id").eq("post_id", postId).limit(1);
      if (!media?.length) {
        try {
          await generateAndAttachPostImages({
            supabase: auth.supabase,
            project,
            postId,
            topic: body.topic,
            visualBrief: generated.visualBrief,
            count: 1,
          });
        } catch {
          // Tekst mag slagen als beeldgeneratie nog niet beschikbaar is.
        }
      }
    }

    return NextResponse.json({ postId, generated });
  } catch (error) {
    return handleRouteError(error);
  }
}

function contentFor(
  platforms: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    wordpress?: string;
  },
  platform: Platform
): string {
  return platforms[platform] ?? "";
}
