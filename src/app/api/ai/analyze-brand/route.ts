import { NextResponse } from "next/server";
import { getAuth, assertProjectAccess } from "@/lib/auth/session";
import { analyzeBrand } from "@/lib/ai/brand-analysis";
import { extractHexFromText, uniqueHexes } from "@/lib/brand/colors";
import { parseStylebook, typeFromStylebookPath } from "@/lib/brand/stylebook";
import { fetchWebsiteContext } from "@/lib/brand/website";
import { handleRouteError, jsonError } from "@/lib/http";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }

    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim();
    const industry = String(form.get("industry") ?? "").trim();
    const websiteUrl = String(form.get("websiteUrl") ?? "").trim();
    const projectId = String(form.get("projectId") ?? "").trim();
    const uploaded = form.get("stylebook");

    if (name.length < 2) {
      return jsonError("Vul eerst de merknaam in.");
    }

    let file = uploaded instanceof File && uploaded.size > 0 ? uploaded : null;
    if (!file && projectId) {
      const project = await assertProjectAccess(auth.supabase, projectId);
      if (project.stylebook_path) {
        const { data } = await auth.supabase.storage.from("stylebooks").download(project.stylebook_path);
        if (data) {
          const filename = project.stylebook_path.split("/").pop() ?? "stylebook";
          file = new File([data], filename, { type: data.type || typeFromStylebookPath(filename) });
        }
      }
    }

    if (!websiteUrl && !file) {
      return jsonError("Voeg een website of een styleguide toe voor de analyse.");
    }

    let websiteContext: string | undefined;
    const observedColors: string[] = [];
    const observedFonts: string[] = [];
    if (websiteUrl) {
      try {
        const website = await fetchWebsiteContext(websiteUrl);
        websiteContext = website.text;
        observedColors.push(...website.colors);
        observedFonts.push(...website.fonts);
      } catch (error) {
        websiteContext = `Website ${websiteUrl} kon niet worden gelezen (${
          error instanceof Error ? error.message : "onbekende fout"
        }).`;
      }
    }

    let stylebookText: string | undefined;
    let images = undefined;
    if (file) {
      const parsed = await parseStylebook(file);
      stylebookText = parsed.text;
      images = parsed.images;
      observedColors.push(...extractHexFromText(parsed.text));
    }

    const analysis = await analyzeBrand({
      name,
      industry: industry || undefined,
      websiteContext,
      stylebookText,
      images,
      observedColors: uniqueHexes(observedColors, 12),
      observedFonts,
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    return handleRouteError(error);
  }
}
