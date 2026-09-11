import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth, assertProjectAccess } from "@/lib/auth/session";
import { handleRouteError, jsonError, readJson } from "@/lib/http";
import { uniqueSlug } from "@/lib/slug";
import { DEFAULT_TIMEZONE } from "@/lib/dates";

const createSchema = z.object({
  name: z.string().min(2),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  industry: z.string().optional(),
  toneOfVoice: z.string().optional(),
  targetAudience: z.string().optional(),
  goals: z.string().optional(),
  visualGuidelines: z.string().optional(),
  timezone: z.string().optional(),
  pillars: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }
    const body = await readJson(request, createSchema);
    const { data: orgId, error: orgError } = await auth.supabase.rpc("ensure_personal_organization");
    if (orgError || !orgId) {
      return jsonError(orgError?.message ?? "Workspace ontbreekt.", 500);
    }

    const { data: project, error } = await auth.supabase
      .from("projects")
      .insert({
        organization_id: orgId,
        name: body.name,
        slug: uniqueSlug(body.name),
        website_url: body.websiteUrl || null,
        industry: body.industry || null,
        tone_of_voice: body.toneOfVoice || null,
        target_audience: body.targetAudience || null,
        goals: body.goals || null,
        visual_guidelines: body.visualGuidelines || null,
        timezone: body.timezone || DEFAULT_TIMEZONE,
      })
      .select("*")
      .single();
    if (error || !project) {
      return jsonError(error?.message ?? "Project aanmaken mislukt.", 500);
    }

    if (body.pillars && body.pillars.length > 0) {
      await auth.supabase.from("content_pillars").insert(
        body.pillars.map((pillar) => ({
          project_id: project.id,
          name: pillar.name,
          description: pillar.description || null,
        }))
      );
    }

    return NextResponse.json({ project });
  } catch (error) {
    return handleRouteError(error);
  }
}

const updateSchema = createSchema.partial().extend({
  id: z.string().uuid(),
});

export async function PATCH(request: Request) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }
    const body = await readJson(request, updateSchema);
    await assertProjectAccess(auth.supabase, body.id);

    const { data: project, error } = await auth.supabase
      .from("projects")
      .update({
        name: body.name,
        website_url: body.websiteUrl,
        industry: body.industry,
        tone_of_voice: body.toneOfVoice,
        target_audience: body.targetAudience,
        goals: body.goals,
        visual_guidelines: body.visualGuidelines,
        timezone: body.timezone,
      })
      .eq("id", body.id)
      .select("*")
      .single();
    if (error || !project) {
      return jsonError(error?.message ?? "Bijwerken mislukt.", 500);
    }
    return NextResponse.json({ project });
  } catch (error) {
    return handleRouteError(error);
  }
}
