import { format, addMonths } from "date-fns";
import { completeChatJson } from "@/lib/ai/generate";
import {
  emptyDocument,
  strategyDocumentSchema,
  type ConversationState,
  type StrategyDocument,
  type StrategyLevel,
} from "@/lib/automaat/model";
import { formatHolidayPrompt, holidayPlanForPeriod, type BeRegion, type MarketCountry } from "@/lib/holidays";

export async function proposeStrategy(input: {
  projectName: string;
  level: StrategyLevel;
  periodMonths: number;
  startsOn: string;
  channels: string[];
  brandContext: string;
  conversation: ConversationState;
  snapshotText?: string | null;
  country: MarketCountry;
  region?: BeRegion | null;
}): Promise<StrategyDocument> {
  const start = input.startsOn.slice(0, 7);
  const months = Array.from({ length: input.periodMonths }, (_, index) => {
    const date = addMonths(new Date(`${input.startsOn.slice(0, 10)}T12:00:00`), index);
    return format(date, "yyyy-MM");
  });
  const plan = holidayPlanForPeriod({
    startsOn: input.startsOn,
    periodMonths: input.periodMonths,
    country: input.country,
    region: input.region,
  });

  const parsed = await completeChatJson({
    systemPrompt: `Je bent een senior contentstrateeg. Nederlands. Geen vage marketingtaal.

Maak een eerste strategiekaart op basis van de website-analyse. Nederlands. Geen vage marketingtaal. Dit is een draft die de gebruiker daarna met ja/nee bijstuurt.
- ${input.level === "eenvoudig" ? "2 of 3" : "3 of 4"} content pillars, share_pct telt op tot 100.
- Hypotheses: ${input.level === "eenvoudig" ? "lege array" : "3 tot 5, elk met een toetsbare uitkomst"}.
- KPI's: ${input.level === "eenvoudig" ? "lege array" : "minstens één. baseline_source is ga4 of gsc als het getal uit de snapshot komt, anders geschat"}.
- monthly_focus: precies deze maanden: ${months.join(", ")}. confirmed is false. Noem feestdagen en seizoensmomenten van die maand als ze relevant zijn. Plan geen campagne op een vrije dag.

JSON:
{
  "positioning": { "for_whom": "", "against_alternative": "", "why_now": "" },
  "audience": { "moment_of_need": "", "notes": "" },
  "pillars": [{ "id": "p1", "name": "", "goal": "awareness", "share_pct": 40, "rationale": "" }],
  "hypotheses": [{ "id": "h1", "statement": "", "created_at": "${format(new Date(), "yyyy-MM-dd")}", "status": "open", "resolved_at": null }],
  "kpis": [{ "pillar_id": "p1", "metric": "", "baseline": 0, "baseline_source": "geschat", "target": 0, "target_date": "" }],
  "monthly_focus": [{ "month": "${start}", "focus": "", "confirmed": false }]
}`,
    userContent: [
      `Merk: ${input.projectName}`,
      `Periode: ${input.periodMonths} maanden vanaf ${input.startsOn}`,
      `Kanalen: ${input.channels.join(", ")}`,
      `Niveau: ${input.level}`,
      `Markt: ${plan.country}${plan.region ? ` / ${plan.region}` : ""}`,
      formatHolidayPrompt(plan),
      `Merkprofiel:\n${input.brandContext || "Nog beperkt."}`,
      input.snapshotText ? `Data-snapshot:\n${input.snapshotText}` : "Geen GA/GSC-snapshot. Nulmetingen zijn schattingen.",
      Object.keys(input.conversation.notes).length > 0
        ? `Afstemming van de gebruiker:\n${Object.entries(input.conversation.notes)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n\n")}`
        : "Nog geen afstemming. Baseer de draft op website-analyse en snapshot.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    temperature: 0.4,
  });

  const document = strategyDocumentSchema.parse({ ...emptyDocument(), ...(parsed as object) });
  const focus =
    document.monthly_focus.length > 0
      ? months.map((month) => {
          const existing = document.monthly_focus.find((item) => item.month === month);
          return existing ?? { month, focus: "Nog in te vullen", confirmed: false };
        })
      : months.map((month) => ({ month, focus: "Nog in te vullen", confirmed: false }));

  return {
    ...document,
    data_sources: {
      ga4: {
        connected: Boolean(input.snapshotText?.includes("GA4 (")),
        last_sync: input.snapshotText?.includes("GA4 (") ? new Date().toISOString() : null,
      },
      gsc: {
        connected: Boolean(input.snapshotText?.includes("Search Console")),
        last_sync: input.snapshotText?.includes("Search Console") ? new Date().toISOString() : null,
      },
    },
    monthly_focus: focus,
    season: {
      country: plan.country,
      region: plan.region ?? "",
      notes: document.season.notes.trim() || plan.notes,
      closed: plan.closed,
      moments: plan.moments,
    },
    version_history: [
      {
        date: new Date().toISOString(),
        change: "strategie aangemaakt",
        reason: "initiële wizard",
      },
    ],
  };
}
