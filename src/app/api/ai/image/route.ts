import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth, assertProjectAccess } from "@/lib/auth/session";
import { brandAnalysisSchema } from "@/lib/ai/brand-analysis";
import { buildImagePrompt, generateImagePngs } from "@/lib/ai/image";
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

    const analysis = brandAnalysisSchema.safeParse(project.brand_analysis);
    const brandColors =
      analysis.success
        ? analysis.data.colorPalette.filter((value) => /^#|^[0-9a-fA-F]{3,8}$/.test(value)).slice(0, 5)
        : [];
    const visualBrief = (body.visualBrief ?? post.visual_brief ?? "").trim();
    const count = body.count ?? 4;

    const prompt = buildImagePrompt({
      topic: body.topic,
      visualBrief: visualBrief || body.topic,
      projectName: project.name,
      visualGuidelines: project.visual_guidelines,
      brandColors,
    });

    const images = await generateImagePngs(prompt, count);
    const urls: string[] = [];
    const paths: string[] = [];

    for (const image of images) {
      const path = `${project.organization_id}/${project.id}/${post.id}/${crypto.randomUUID()}.png`;
      const { error: uploadError } = await auth.supabase.storage
        .from("post-images")
        .upload(path, new Blob([new Uint8Array(image)], { type: "image/png" }), {
          contentType: "image/png",
          upsert: false,
        });
      if (uploadError) {
        return jsonError(uploadError.message, 500);
      }
      const { data } = auth.supabase.storage.from("post-images").getPublicUrl(path);
      urls.push(data.publicUrl);
      paths.push(path);
    }

    const { data: existing } = await auth.supabase.from("media").select("storage_path").eq("post_id", post.id);
    const stale = (existing ?? []).map((item) => item.storage_path).filter((path): path is string => Boolean(path));
    if (stale.length > 0) {
      await auth.supabase.storage.from("post-images").remove(stale);
    }
    await auth.supabase.from("media").delete().eq("post_id", post.id).is("platform", null);
    await auth.supabase.from("media").insert({
      project_id: project.id,
      post_id: post.id,
      public_url: urls[0],
      storage_path: paths[0],
    });

    if (visualBrief) {
      await auth.supabase.from("posts").update({ visual_brief: visualBrief }).eq("id", post.id);
    }

    return NextResponse.json({ urls, selected: urls[0] });
  } catch (error) {
    return handleRouteError(error);
  }
}
