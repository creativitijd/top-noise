import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/session";
import { analyzeBrand } from "@/lib/ai/brand-analysis";
import { parseStylebook } from "@/lib/brand/stylebook";
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
    const file = form.get("stylebook");

    if (name.length < 2) {
      return jsonError("Vul eerst de merknaam in.");
    }
    if (!websiteUrl && !(file instanceof File && file.size > 0)) {
      return jsonError("Voeg een website of een stylboek toe voor de analyse.");
    }

    let websiteContext: string | undefined;
    if (websiteUrl) {
      try {
        websiteContext = await fetchWebsiteContext(websiteUrl);
      } catch (error) {
        websiteContext = `Website ${websiteUrl} kon niet worden gelezen (${
          error instanceof Error ? error.message : "onbekende fout"
        }).`;
      }
    }

    let stylebookText: string | undefined;
    let images = undefined;
    if (file instanceof File && file.size > 0) {
      const parsed = await parseStylebook(file);
      stylebookText = parsed.text;
      images = parsed.images;
    }

    const analysis = await analyzeBrand({
      name,
      industry: industry || undefined,
      websiteContext,
      stylebookText,
      images,
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    return handleRouteError(error);
  }
}
