import { z } from "zod";
import type { Platform } from "@/lib/platforms";

export const STRATEGY_LEVELS = ["eenvoudig", "normaal", "uitgebreid"] as const;
export type StrategyLevel = (typeof STRATEGY_LEVELS)[number];

export const AUTOMAAT_CHANNELS = ["facebook", "instagram", "linkedin"] as const;
export type AutomaatChannel = (typeof AUTOMAAT_CHANNELS)[number];

export const STRATEGY_TOPICS = ["positioning", "audience", "goal", "competition", "tone"] as const;
export type StrategyTopic = (typeof STRATEGY_TOPICS)[number];

export const LEVEL_META: Record<
  StrategyLevel,
  { label: string; time: string; blurb: string; probes: number }
> = {
  eenvoudig: {
    label: "Eenvoudig",
    time: "5–10 min",
    blurb: "Basisvragen, een kort plan, zonder doorvragen.",
    probes: 0,
  },
  normaal: {
    label: "Normaal",
    time: "15–20 min",
    blurb: "1–2 rondes per onderwerp, lichte concurrentie, één hoofd-KPI.",
    probes: 2,
  },
  uitgebreid: {
    label: "Uitgebreid",
    time: "45–60 min",
    blurb: "Elk antwoord wordt getoetst. Concurrentie, KPI’s en maanden apart.",
    probes: 4,
  },
};

export const TOPIC_COPY: Record<
  StrategyTopic,
  { title: string; question: string; chips: string[]; enough: string }
> = {
  positioning: {
    title: "Positionering",
    question:
      "Wat doe je, voor wie, en waar kies jij voor in plaats van het voor de hand liggende alternatief?",
    chips: ["We maken X voor Y, niet voor Z", "We zijn duurder omdat…", "We doen één ding heel scherp"],
    enough: "Duidelijk wat je doet, voor wie, en tegen welk alternatief.",
  },
  audience: {
    title: "Doelgroep",
    question: "Beschrijf één concreet moment waarop iemand jullie nodig heeft. Wat gebeurt er die dag?",
    chips: ["Net een webshop gestart", "Eerste verjaardag in zicht", "Team groeit, chaos in tools"],
    enough: "Een herkenbaar moment van behoefte, geen vage demografische groep.",
  },
  goal: {
    title: "Doel en KPI",
    question: "Welk getal moet over deze periode omhoog, en hoe hoog staat het nu ongeveer?",
    chips: ["Meer aanvragen per maand", "Meer sessies via social", "Meer inschrijvingen"],
    enough: "Een meetbaar getal, een termijn, en een ruwe nulmeting.",
  },
  competition: {
    title: "Concurrentie",
    question: "Noem tot drie partijen waar klanten jou mee vergelijken. Wat zeggen zij dat jij bewust niet zegt?",
    chips: ["We zijn niet de goedkoopste", "Zij pushen features, wij rust", "Wij vermijden jargon"],
    enough: "Concreet wie de vergelijking is, en wat jij dus niet doet.",
  },
  tone: {
    title: "Toon van stem",
    question: "Welke zin klinkt het meest als jullie? En wat mag er nooit in een post staan?",
    chips: ["Kort en nuchter", "Warm, geen marketingtaal", "Je, nooit u"],
    enough: "Voorbeeld van de stem én iets dat expliciet niet past.",
  },
};

export function topicsForLevel(level: StrategyLevel): StrategyTopic[] {
  if (level === "eenvoudig") {
    return ["positioning", "audience", "goal", "tone"];
  }
  return [...STRATEGY_TOPICS];
}

export function postsPerMonth(level: StrategyLevel): number {
  if (level === "eenvoudig") {
    return 8;
  }
  if (level === "normaal") {
    return 10;
  }
  return 12;
}

export const chatMessageSchema = z.object({
  role: z.enum(["assistant", "user"]),
  content: z.string(),
  chips: z.array(z.string()).optional(),
  topic: z.string().optional(),
});

export const conversationStateSchema = z.object({
  topicIndex: z.number().int().nonnegative().default(0),
  probes: z.number().int().nonnegative().default(0),
  notes: z.record(z.string(), z.string()).default({}),
  messages: z.array(chatMessageSchema).default([]),
  done: z.boolean().default(false),
});

export const strategyDocumentSchema = z.object({
  positioning: z
    .object({
      for_whom: z.string().default(""),
      against_alternative: z.string().default(""),
      why_now: z.string().default(""),
    })
    .default({ for_whom: "", against_alternative: "", why_now: "" }),
  audience: z
    .object({
      moment_of_need: z.string().default(""),
      notes: z.string().default(""),
    })
    .default({ moment_of_need: "", notes: "" }),
  pillars: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        goal: z.enum(["awareness", "consideration", "conversie"]).default("awareness"),
        share_pct: z.number().int().min(0).max(100).default(33),
        rationale: z.string().default(""),
      })
    )
    .default([]),
  hypotheses: z
    .array(
      z.object({
        id: z.string(),
        statement: z.string(),
        created_at: z.string(),
        status: z.enum(["open", "bevestigd", "weerlegd", "onduidelijk"]).default("open"),
        resolved_at: z.string().nullable().default(null),
      })
    )
    .default([]),
  kpis: z
    .array(
      z.object({
        pillar_id: z.string().default(""),
        metric: z.string(),
        baseline: z.number().nullable().default(null),
        baseline_source: z.enum(["ga4", "gsc", "geschat"]).default("geschat"),
        target: z.number().nullable().default(null),
        target_date: z.string().default(""),
      })
    )
    .default([]),
  monthly_focus: z
    .array(
      z.object({
        month: z.string(),
        focus: z.string(),
        confirmed: z.boolean().default(false),
      })
    )
    .default([]),
  data_sources: z
    .object({
      ga4: z.object({ connected: z.boolean().default(false), last_sync: z.string().nullable().default(null) }),
      gsc: z.object({ connected: z.boolean().default(false), last_sync: z.string().nullable().default(null) }),
    })
    .default({
      ga4: { connected: false, last_sync: null },
      gsc: { connected: false, last_sync: null },
    }),
  version_history: z
    .array(
      z.object({
        date: z.string(),
        change: z.string(),
        reason: z.string(),
      })
    )
    .default([]),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ConversationState = z.infer<typeof conversationStateSchema>;
export type StrategyDocument = z.infer<typeof strategyDocumentSchema>;

export type StrategyRecord = {
  id: string;
  project_id: string;
  status: "draft" | "active" | "archived";
  level: StrategyLevel;
  period_months: 3 | 6 | 9;
  channels: string[];
  starts_on: string;
  conversation: ConversationState;
  document: StrategyDocument;
  data_snapshot: unknown;
  created_at: string;
  updated_at: string;
};

export function emptyConversation(level: StrategyLevel): ConversationState {
  const topic = topicsForLevel(level)[0];
  const copy = TOPIC_COPY[topic];
  return {
    topicIndex: 0,
    probes: 0,
    notes: {},
    done: false,
    messages: [
      {
        role: "assistant",
        content: copy.question,
        chips: copy.chips,
        topic,
      },
    ],
  };
}

export function emptyDocument(): StrategyDocument {
  return strategyDocumentSchema.parse({});
}

export function isAutomaatChannel(value: string): value is AutomaatChannel {
  return (AUTOMAAT_CHANNELS as readonly string[]).includes(value);
}

export function asPlatforms(channels: string[]): Platform[] {
  return channels.filter((item): item is Platform =>
    item === "facebook" || item === "instagram" || item === "linkedin" || item === "wordpress"
  );
}
