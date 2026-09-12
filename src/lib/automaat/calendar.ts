import { addDays, format, getDay, parseISO } from "date-fns";
import { z } from "zod";
import {
  formatStoredAnalysis,
  formatVisualIdentity,
  parsedBrandAnalysis,
  withBrandVisualBrief,
} from "@/lib/ai/brand-analysis";
import { completeChatJson, generateJsonContent } from "@/lib/ai/generate";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import { voiceFromStored } from "@/lib/ai/voice";
import { asPlatforms, postsPerMonth, type StrategyDocument, type StrategyLevel } from "@/lib/automaat/model";
import { scheduledAtForDay } from "@/lib/dates";
import { formatHolidayPrompt, holidayPlanForPeriod, projectMarket } from "@/lib/holidays";
import type { Authed } from "@/lib/auth/session";
import type { ContentPillar, Post, Project } from "@/types/database";

const outlineSchema = z.object({
  posts: z.array(
    z.object({
      date: z.string(),
      topic: z.string().min(2),
      pillar: z.string().default(""),
    })
  ),
});

export async function generateStrategyCalendar(input: {
  supabase: Authed["supabase"];
  project: Project;
  strategyId: string;
  level: StrategyLevel;
  startsOn: string;
  periodMonths: number;
  channels: string[];
  document: StrategyDocument;
}): Promise<{ created: number; written: number }> {
  const platforms = asPlatforms(input.channels);
  const count = postsPerMonth(input.level);
  const market = projectMarket(input.project);
  const plan = input.document.season.country
    ? {
        closed: input.document.season.closed,
        moments: input.document.season.moments,
        notes: input.document.season.notes,
      }
    : holidayPlanForPeriod({
        startsOn: input.startsOn,
        periodMonths: input.periodMonths,
        country: market.country,
        region: market.region,
      });
  const closed = new Set(plan.closed.map((item) => item.date));
  const dates = planningDates(input.startsOn, input.periodMonths * count, closed);
  const analysis = parsedBrandAnalysis(input.project.brand_analysis);
  const visualIdentity = formatVisualIdentity(analysis, input.project.visual_guidelines);
  const pillars = await syncStrategyPillars(input.supabase, input.project.id, input.document);

  const outline = outlineSchema.parse(
    await completeChatJson({
      systemPrompt: `Je plant social content als een senior marketeer. Nederlands. Geen clickbait.

JSON: { "posts": [{ "date": "YYYY-MM-DD", "topic": "concreet onderwerp", "pillar": "naam van pillar" }] }

Gebruik alleen deze datums: ${dates.join(", ")}
Eén post per datum. Onderwerpen volgen de pillars en maandzwaartepunten. Geen dubbele thema's achter elkaar.
${formatHolidayPrompt(plan)}
${plan.notes ? `Aanpak feestdagen: ${plan.notes}` : ""}`,
      userContent: [
        `Merk: ${input.project.name}`,
        `Kanalen: ${input.channels.join(", ")}`,
        `Pillars: ${input.document.pillars.map((pillar) => `${pillar.name} (${pillar.share_pct}%)`).join("; ")}`,
        `Maandfocus: ${input.document.monthly_focus.map((item) => `${item.month}: ${item.focus}`).join("; ")}`,
        `Doelgroep: ${input.document.audience.moment_of_need}`,
        `Positionering: ${input.document.positioning.for_whom} / ${input.document.positioning.against_alternative}`,
      ].join("\n"),
      temperature: 0.5,
    })
  );

  const items = dates.map((date, index) => ({
    date,
    topic: outline.posts[index]?.topic ?? `Onderwerp ${index + 1}`,
    pillar: outline.posts[index]?.pillar ?? input.document.pillars[index % Math.max(input.document.pillars.length, 1)]?.name ?? "",
  }));
  const createdPosts: { post: Post; topic: string; date: string; writeNow: boolean }[] = [];

  for (const [index, item] of items.entries()) {
    const date = item.date.slice(0, 10);
    const pillar = pillars.find((row) => row.name.toLowerCase() === item.pillar.trim().toLowerCase());
    const hour = [9, 11, 17][index % 3];
    const scheduledAt = scheduledAtForDay(date, input.project.timezone, hour);
    const visualBrief = withBrandVisualBrief(item.topic, "", analysis, input.project.visual_guidelines);
    const insertCore = {
      project_id: input.project.id,
      pillar_id: pillar?.id ?? null,
      topic: item.topic,
      visual_brief: visualBrief,
      scheduled_at: scheduledAt,
      timezone: input.project.timezone,
      status: "draft" as const,
      strategy_id: input.strategyId,
    };

    let post = (await input.supabase.from("posts").insert(insertCore).select("*").single()).data;
    if (!post) {
      const { strategy_id: _ignored, ...withoutStrategy } = insertCore;
      void _ignored;
      const retry = await input.supabase.from("posts").insert(withoutStrategy).select("*").single();
      post = retry.data;
    }
    if (!post) {
      continue;
    }
    createdPosts.push({
      post,
      topic: item.topic,
      date,
      writeNow: createdPosts.length < count,
    });
  }

  const draftTargets = createdPosts
    .filter((row) => !row.writeNow)
    .flatMap((row) =>
      platforms.map((platform) => ({
        post_id: row.post.id,
        platform,
        content: "",
        hashtags: [] as string[],
        status: "draft" as const,
      }))
    );
  if (draftTargets.length > 0) {
    await input.supabase.from("post_targets").insert(draftTargets);
  }

  const toWrite = createdPosts.filter((row) => row.writeNow);
  let written = 0;
  await mapLimit(toWrite, 3, async (row) => {
    try {
      const generated = await generateJsonContent({
        systemPrompt: buildSystemPrompt({
          projectName: input.project.name,
          industry: input.project.industry,
          toneOfVoice: input.project.tone_of_voice,
          targetAudience: input.project.target_audience,
          goals: input.project.goals,
          visualGuidelines: input.project.visual_guidelines,
          visualIdentity,
          brandAnalysis: formatStoredAnalysis(input.project.brand_analysis),
          pillars,
          voice: voiceFromStored(input.project.brand_analysis, input.project.tone_of_voice),
        }),
        userPrompt: buildUserPrompt({
          topic: row.topic,
          platforms,
          scheduledAt: row.post.scheduled_at,
        }),
      });
      generated.visualBrief = withBrandVisualBrief(
        row.topic,
        generated.visualBrief,
        analysis,
        input.project.visual_guidelines
      );
      await input.supabase
        .from("posts")
        .update({
          title: generated.title,
          explanation: generated.explanation,
          visual_brief: generated.visualBrief,
        })
        .eq("id", row.post.id);
      await input.supabase.from("post_targets").insert(
        platforms.map((platform) => ({
          post_id: row.post.id,
          platform,
          content: generated.platforms[platform] ?? "",
          hashtags: generated.hashtags,
          status: "draft" as const,
        }))
      );
      written += 1;
    } catch {
      await input.supabase.from("post_targets").insert(
        platforms.map((platform) => ({
          post_id: row.post.id,
          platform,
          content: "",
          hashtags: [] as string[],
          status: "draft" as const,
        }))
      );
    }
  });

  return { created: createdPosts.length, written };
}

export async function syncStrategyPillars(
  supabase: Authed["supabase"],
  projectId: string,
  document: StrategyDocument
): Promise<ContentPillar[]> {
  const { data: existing } = await supabase.from("content_pillars").select("*").eq("project_id", projectId);
  const have = new Set((existing ?? []).map((row) => row.name.trim().toLowerCase()));
  const missing = document.pillars.filter(
    (pillar) => pillar.name.trim() && !have.has(pillar.name.trim().toLowerCase())
  );
  if (missing.length > 0) {
    await supabase.from("content_pillars").insert(
      missing.map((pillar) => ({
        project_id: projectId,
        name: pillar.name.trim(),
        description: pillar.rationale || `Doel: ${pillar.goal}, aandeel ${pillar.share_pct}%`,
      }))
    );
  }
  const { data } = await supabase.from("content_pillars").select("*").eq("project_id", projectId);
  return data ?? existing ?? [];
}

async function mapLimit<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, () => run()));
}

function planningDates(startsOn: string, count: number, closed: Set<string>): string[] {
  const dates: string[] = [];
  let cursor = parseISO(startsOn.slice(0, 10));
  let guard = 0;
  while (dates.length < count && guard < count * 4 + 90) {
    guard += 1;
    const iso = format(cursor, "yyyy-MM-dd");
    const day = getDay(cursor);
    if (day !== 0 && day !== 6 && !closed.has(iso)) {
      dates.push(iso);
    }
    cursor = addDays(cursor, 1);
  }
  return dates;
}
