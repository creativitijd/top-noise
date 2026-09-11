import { z } from "zod";
import { completeChatJson, type ChatContentPart } from "@/lib/ai/generate";
import { extractVoiceCandidates } from "@/lib/brand/website";

export const audienceSegmentSchema = z.object({
  name: z.string().min(1),
  role: z.string().default(""),
  primary: z.boolean().default(false),
  who: z.string().min(1),
  goals: z.string().default(""),
  frustrations: z.string().default(""),
  language: z.string().default(""),
  channels: z.preprocess((value) => {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
    if (typeof value === "string") {
      return value
        .split(/[,;]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  }, z.array(z.string()).default([])),
  avoid: z.string().default(""),
});

export type AudienceSegment = z.infer<typeof audienceSegmentSchema>;

export const brandAnalysisSchema = z.object({
  summary: z.string().min(1),
  industry: z.string().min(1),
  positioning: z.string().min(1),
  toneOfVoice: z.string().min(1),
  targetAudience: z.string().min(1),
  goals: z.string().min(1),
  visualGuidelines: z.string().min(1),
  dos: z.array(z.string()).default([]),
  donts: z.array(z.string()).default([]),
  colorPalette: z.array(z.string()).default([]),
  typography: z.string().default(""),
  writingSamples: z.preprocess(
    (value) => (Array.isArray(value) ? value.filter((item) => typeof item === "string") : []),
    z.array(z.string()).max(8).default([])
  ),
  voiceNotes: z.string().default(""),
  wordsWeUse: z.preprocess(
    (value) => (Array.isArray(value) ? value.filter((item) => typeof item === "string") : []),
    z.array(z.string()).default([])
  ),
  wordsWeAvoid: z.preprocess(
    (value) => (Array.isArray(value) ? value.filter((item) => typeof item === "string") : []),
    z.array(z.string()).default([])
  ),
  addressForm: z.string().default(""),
  audiences: z.array(audienceSegmentSchema).max(4).default([]),
  pillars: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().default(""),
      })
    )
    .max(8),
});

export type BrandAnalysis = z.infer<typeof brandAnalysisSchema>;

export async function analyzeBrand(input: {
  name: string;
  industry?: string;
  websiteContext?: string;
  stylebookText?: string;
  images?: ChatContentPart[];
}): Promise<BrandAnalysis> {
  const parts: ChatContentPart[] = [
    {
      type: "text",
      text: [
        `Merknaam: ${input.name}`,
        input.industry ? `Opgegeven branche: ${input.industry}` : null,
        input.websiteContext ? `Website:\n${input.websiteContext}` : "Geen website-inhoud beschikbaar.",
        input.stylebookText ? input.stylebookText : "Geen styleguide-tekst.",
        "Leid uit alle bronnen een bruikbaar merkprofiel, een doelgroepbepaling én een schrijfstem af. Verzin geen feiten die nergens in de bronnen staan; markeer aannames kort als aanname.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
    ...(input.images ?? []),
  ];

  const parsed = await completeChatJson({
    systemPrompt: `Je bent een merkanalyst, brand strategist en doelgroepsonderzoeker. Je maakt een praktisch profiel waarmee social content on-brand én relevant blijft voor de juiste mensen.

Werk de doelgroepbepaling uit alsof je een briefing voor een contentkalender schrijft: concreet, herkenbaar, geen vage termen als "iedereen" of "MKB".

Antwoord uitsluitend als JSON:
{
  "summary": "korte merksamenvatting in 4-8 zinnen",
  "industry": "branche",
  "positioning": "hoe dit merk zich onderscheidt",
  "toneOfVoice": "concrete toonregels: aanspreekvorm, ritme, humor, formaliteit, met woorden die wel/niet passen",
  "targetAudience": "samenvatting van de doelgroepbepaling in 4-8 zinnen, primaire groep eerst",
  "goals": "communicatie- en groeidoelen",
  "visualGuidelines": "kleuren, typografie, beeldstijl, compositie, wat te vermijden",
  "dos": ["..."],
  "donts": ["..."],
  "colorPalette": ["#hex of kleurnaam"],
  "typography": "fonts en hiërarchie",
  "writingSamples": ["letterlijke zin van de website 1", "letterlijke zin 2"],
  "voiceNotes": "je/jullie/u, zinslengte, humor, hoe direct, wat typisch is voor deze stem",
  "wordsWeUse": ["woorden of korte frases die het merk zelf gebruikt"],
  "wordsWeAvoid": ["woorden die dit merk niet gebruikt, plus typische AI-woorden"],
  "addressForm": "je",
  "audiences": [
    {
      "name": "korte naam, bijv. Eigenaar webshop",
      "role": "functie of levensfase",
      "primary": true,
      "who": "wie dit is: leeftijd/fase, context, bedrijfsgrootte of huishouden",
      "goals": "wat ze willen bereiken",
      "frustrations": "waar ze tegenaan lopen",
      "language": "woorden en toon die bij hen passen",
      "channels": ["LinkedIn", "Instagram"],
      "avoid": "wat hen afstoot in content"
    }
  ],
  "pillars": [{"name":"...","description":"..."}]
}

Schrijf in het Nederlands. Geef 3 tot 6 contentpijlers.
Geef 2 of 3 doelgroepen: precies één met primary true, plus 1 of 2 secundaire groepen.
Schrijfstem: kopieer 4 tot 6 LETTERLIJKE zinnen van de website (of kandidaatzinnen) die de stem het best vangen. Parafraseer die zinnen niet. Als de site u zegt, niet je. Als de site kort en nuchter is, zeg dat in voiceNotes.`,
    userContent: parts,
    model: process.env.AI_ANALYSIS_MODEL ?? process.env.AI_MODEL ?? "gpt-4o",
    temperature: 0.25,
  });

  const analysis = brandAnalysisSchema.parse(parsed);
  const next = { ...analysis, writingSamples: withWebsiteSamples(analysis.writingSamples, input.websiteContext) };
  if (next.audiences.length > 0 && next.targetAudience.trim().length < 40) {
    return { ...next, targetAudience: formatAudiences(next.audiences) };
  }
  return next;
}

function withWebsiteSamples(samples: string[], websiteContext?: string): string[] {
  const cleaned = samples.map((sample) => sample.trim()).filter((sample) => sample.length >= 24);
  if (cleaned.length >= 3 || !websiteContext) {
    return cleaned.slice(0, 6);
  }
  const seen = new Set(cleaned.map((sample) => sample.toLowerCase()));
  for (const sentence of extractVoiceCandidates(websiteContext)) {
    const key = sentence.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    cleaned.push(sentence);
    seen.add(key);
    if (cleaned.length >= 6) {
      break;
    }
  }
  return cleaned.slice(0, 6);
}

export function formatAudiences(audiences: AudienceSegment[]): string {
  return audiences
    .map((audience) => {
      const label = audience.primary ? "Primair" : "Secundair";
      const role = audience.role ? ` (${audience.role})` : "";
      const channels = audience.channels.length > 0 ? ` Kanalen: ${audience.channels.join(", ")}.` : "";
      return `${label} — ${audience.name}${role}: ${audience.who} Wil: ${audience.goals} Frustraties: ${audience.frustrations} Toon: ${audience.language}.${channels}${
        audience.avoid ? ` Vermijd: ${audience.avoid}` : ""
      }`;
    })
    .join("\n\n");
}

export function formatBrandAnalysis(analysis: BrandAnalysis): string {
  const audienceBlock =
    analysis.audiences.length > 0 ? `Doelgroepbepaling:\n${formatAudiences(analysis.audiences)}` : `Doelgroep: ${analysis.targetAudience}`;
  return [
    analysis.summary,
    `Positionering: ${analysis.positioning}`,
    `Toon: ${analysis.toneOfVoice}`,
    analysis.addressForm ? `Aanspreekvorm: ${analysis.addressForm}` : null,
    analysis.voiceNotes ? `Schrijfstem: ${analysis.voiceNotes}` : null,
    analysis.writingSamples.length > 0
      ? `Voorbeeldzinnen van de website:\n${analysis.writingSamples.map((sample) => `- ${sample}`).join("\n")}`
      : null,
    analysis.wordsWeUse.length > 0 ? `Woorden die dit merk gebruikt: ${analysis.wordsWeUse.join(", ")}` : null,
    analysis.wordsWeAvoid.length > 0 ? `Woorden die dit merk mijdt: ${analysis.wordsWeAvoid.join(", ")}` : null,
    audienceBlock,
    analysis.colorPalette.length > 0 ? `Kleuren: ${analysis.colorPalette.join(", ")}` : null,
    analysis.typography ? `Typografie: ${analysis.typography}` : null,
    analysis.dos.length > 0 ? `Wel: ${analysis.dos.join("; ")}` : null,
    analysis.donts.length > 0 ? `Niet: ${analysis.donts.join("; ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatStoredAnalysis(value: unknown): string | null {
  const parsed = brandAnalysisSchema.safeParse(value);
  if (!parsed.success) {
    return null;
  }
  return formatBrandAnalysis(parsed.data);
}
