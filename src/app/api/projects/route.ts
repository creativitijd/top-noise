import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth, assertProjectAccess } from "@/lib/auth/session";
import { brandAnalysisSchema } from "@/lib/ai/brand-analysis";
import { handleRouteError, jsonError, readJson } from "@/lib/http";
import { uniqueSlug } from "@/lib/slug";
import { DEFAULT_TIMEZONE } from "@/lib/dates";
import { COUNTRY_META, projectMarket } from "@/lib/holidays";

const MIGRATION_HINT =
  "Draai in Supabase → SQL Editor het bestand supabase/migrations/0002_brand_analysis.sql en klik daarna Run.";
const MARKET_MIGRATION_HINT =
  "Draai in Supabase → SQL Editor het bestand supabase/migrations/0005_market.sql en klik daarna Run.";

function missingBrandColumn(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes("schema cache") &&
    (lower.includes("brand_analysis") || lower.includes("stylebook_path") || lower.includes("stylebook_url"))
  );
}

function missingMarketColumn(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  const lower = message.toLowerCase();
  return (
    (lower.includes("country") || lower.includes("region")) &&
    (lower.includes("schema cache") || lower.includes("does not exist") || lower.includes("could not find"))
  );
}

const createSchema = z.object({
  name: z.string().min(2),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  industry: z.string().optional(),
  toneOfVoice: z.string().optional(),
  targetAudience: z.string().optional(),
  goals: z.string().optional(),
  visualGuidelines: z.string().optional(),
  brandAnalysis: brandAnalysisSchema.optional(),
  timezone: z.string().optional(),
  country: z.enum(["NL", "BE", "DE"]).optional(),
  region: z.enum(["VLG", "WAL", "BRU"]).nullable().optional(),
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

    const market = projectMarket({
      country: body.country,
      region: body.region,
      timezone: body.timezone,
    });
    const core = {
      organization_id: orgId,
      name: body.name,
      slug: uniqueSlug(body.name),
      website_url: body.websiteUrl || null,
      industry: body.industry || null,
      tone_of_voice: body.toneOfVoice || null,
      target_audience: body.targetAudience || null,
      goals: body.goals || null,
      visual_guidelines: body.visualGuidelines || null,
      timezone: body.timezone || COUNTRY_META[market.country].timezone || DEFAULT_TIMEZONE,
      country: market.country,
      region: market.region,
    };

    let { data: project, error } = await auth.supabase
      .from("projects")
      .insert({ ...core, brand_analysis: body.brandAnalysis ?? null })
      .select("*")
      .single();

    let warning: string | undefined;
    if (error && missingMarketColumn(error.message)) {
      const { country: _country, region: _region, ...withoutMarket } = core;
      void _country;
      void _region;
      const retry = await auth.supabase
        .from("projects")
        .insert({ ...withoutMarket, brand_analysis: body.brandAnalysis ?? null })
        .select("*")
        .single();
      project = retry.data;
      error = retry.error;
      warning = `Merk opgeslagen, land/feestdagen nog niet. ${MARKET_MIGRATION_HINT}`;
    }
    if (error && missingBrandColumn(error.message)) {
      const retry = await auth.supabase.from("projects").insert(core).select("*").single();
      project = retry.data;
      error = retry.error;
      warning = `Merkprofiel opgeslagen, merkanalyse nog niet. ${MIGRATION_HINT}`;
    }

    if (error || !project) {
      return jsonError(
        missingMarketColumn(error?.message)
          ? MARKET_MIGRATION_HINT
          : missingBrandColumn(error?.message)
            ? MIGRATION_HINT
            : (error?.message ?? "Project aanmaken mislukt."),
        500
      );
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

    return NextResponse.json({ project, warning });
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

    const market =
      body.country !== undefined || body.region !== undefined
        ? projectMarket({ country: body.country, region: body.region, timezone: body.timezone })
        : null;
    const core = {
      name: body.name,
      website_url: body.websiteUrl,
      industry: body.industry,
      tone_of_voice: body.toneOfVoice,
      target_audience: body.targetAudience,
      goals: body.goals,
      visual_guidelines: body.visualGuidelines,
      timezone: body.timezone,
      ...(market ? { country: market.country, region: market.region } : {}),
    };
    const payload =
      body.brandAnalysis === undefined ? core : { ...core, brand_analysis: body.brandAnalysis };

    let { data: project, error } = await auth.supabase
      .from("projects")
      .update(payload)
      .eq("id", body.id)
      .select("*")
      .single();

    let warning: string | undefined;
    if (error && missingMarketColumn(error.message)) {
      const { country: _country, region: _region, ...withoutMarket } = core;
      void _country;
      void _region;
      const retryPayload =
        body.brandAnalysis === undefined ? withoutMarket : { ...withoutMarket, brand_analysis: body.brandAnalysis };
      const retry = await auth.supabase.from("projects").update(retryPayload).eq("id", body.id).select("*").single();
      project = retry.data;
      error = retry.error;
      warning = `Merk opgeslagen, land/feestdagen nog niet. ${MARKET_MIGRATION_HINT}`;
    }
    if (error && missingBrandColumn(error.message)) {
      const retry = await auth.supabase.from("projects").update(core).eq("id", body.id).select("*").single();
      project = retry.data;
      error = retry.error;
      warning = `Merkprofiel opgeslagen, merkanalyse nog niet. ${MIGRATION_HINT}`;
    }

    if (error || !project) {
      return jsonError(
        missingMarketColumn(error?.message)
          ? MARKET_MIGRATION_HINT
          : missingBrandColumn(error?.message)
            ? MIGRATION_HINT
            : (error?.message ?? "Bijwerken mislukt."),
        500
      );
    }
    return NextResponse.json({ project, warning });
  } catch (error) {
    return handleRouteError(error);
  }
}
