import { z } from "zod";
import { completeChatJson, type ChatContentPart } from "@/lib/ai/generate";
import { normalizeHex, toSwatch, uniqueHexes, type ColorSwatch } from "@/lib/brand/colors";
import { extractVoiceCandidates } from "@/lib/brand/website";

const colorSwatchSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const hex = value.match(/#(?:[0-9a-fA-F]{3,8})/)?.[0] ?? value;
    return {
      hex,
      name: value.replace(/#(?:[0-9a-fA-F]{3,8})/, "").trim(),
      usage: "",
    };
  }
  return value;
}, z.object({
  hex: z.string().default(""),
  name: z.string().default(""),
  usage: z.string().default(""),
}));

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
  summary: z.string().default(""),
  industry: z.string().default(""),
  positioning: z.string().default(""),
  toneOfVoice: z.string().default(""),
  targetAudience: z.string().default(""),
  goals: z.string().default(""),
  visualGuidelines: z.string().default(""),
  dos: z.array(z.string()).default([]),
  donts: z.array(z.string()).default([]),
  colorPalette: z.array(z.string()).default([]),
  primaryColors: z.array(colorSwatchSchema).max(12).default([]),
  supportingColors: z.array(colorSwatchSchema).max(16).default([]),
  neutralColors: z.array(colorSwatchSchema).max(12).default([]),
  imageStyle: z.string().default(""),
  visualAvoid: z.preprocess(
    (value) => (Array.isArray(value) ? value.filter((item) => typeof item === "string") : []),
    z.array(z.string()).default([])
  ),
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
    .max(8)
    .default([]),
});

export type BrandAnalysis = z.infer<typeof brandAnalysisSchema>;

export async function analyzeBrand(input: {
  name: string;
  industry?: string;
  websiteContext?: string;
  stylebookText?: string;
  images?: ChatContentPart[];
  observedColors?: string[];
  observedFonts?: string[];
}): Promise<BrandAnalysis> {
  const observedColors = uniqueHexes(input.observedColors ?? [], 12);
  const parts: ChatContentPart[] = [
    {
      type: "text",
      text: [
        `Merknaam: ${input.name}`,
        input.industry ? `Opgegeven branche: ${input.industry}` : null,
        input.websiteContext ? `Website:\n${input.websiteContext}` : "Geen website-inhoud beschikbaar.",
        input.stylebookText ? input.stylebookText : "Geen styleguide-tekst.",
        observedColors.length > 0
          ? `Gemeten kleuren (styleguide en/of website, gebruik deze hex-codes, verzin geen andere paletten): ${observedColors.join(", ")}`
          : "Er zijn geen gemeten hex-codes. Lees kleuren uit de styleguide-afbeelding of beschrijf ze alleen als ze expliciet in de tekst staan.",
        input.observedFonts?.length ? `Gemeten fonts: ${input.observedFonts.join(", ")}` : null,
        "Leid uit alle bronnen een bruikbaar merkprofiel, een doelgroepbepaling, een schrijfstem én visuele aandachtspunten af. Verzin geen feiten die nergens in de bronnen staan; markeer aannames kort als aanname.",
        "Visuele aandachtspunten: styleguide gaat vóór website. Vul hoofdkleuren, steunkleuren en neutrals. Geef hex als je die ziet of meet. De gebruiker vult daarna zelf extra kleuren aan.",
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
  "visualGuidelines": "korte samenvatting: hoofdkleuren, steunkleuren, typografie, beeldstijl, wat te vermijden",
  "dos": ["..."],
  "donts": ["..."],
  "colorPalette": ["#RRGGBB"],
  "primaryColors": [{"hex":"#RRGGBB","name":"Hoofdkleur","usage":"knoppen, accenten"}],
  "supportingColors": [{"hex":"#RRGGBB","name":"Steunkleur","usage":"highlights"}],
  "neutralColors": [{"hex":"#RRGGBB","name":"Achtergrond","usage":"vlakken"}],
  "imageStyle": "fotografie/illustratie, licht, compositie, sfeer",
  "visualAvoid": ["wat visueel niet mag"],
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
Schrijfstem: kopieer 4 tot 6 LETTERLIJKE zinnen van de website (of kandidaatzinnen) die de stem het best vangen. Parafraseer die zinnen niet. Als de site u zegt, niet je. Als de site kort en nuchter is, zeg dat in voiceNotes.
Visueel: gebruik gemeten hex-codes. Styleguide wint bij conflict. Geen kleuren verzinnen die niet in de bronnen zitten.`,
    userContent: parts,
    model: process.env.AI_ANALYSIS_MODEL ?? process.env.AI_MODEL ?? "gpt-4o",
    temperature: 0.25,
  });

  const analysis = brandAnalysisSchema.parse(parsed);
  const next = hydrateVisualIdentity(
    { ...analysis, writingSamples: withWebsiteSamples(analysis.writingSamples, input.websiteContext) },
    observedColors
  );
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
    formatSwatchLine("Hoofdkleuren", analysis.primaryColors),
    formatSwatchLine("Steunkleuren", analysis.supportingColors),
    formatSwatchLine("Neutrals", analysis.neutralColors),
    analysis.colorPalette.length > 0 && analysis.primaryColors.length === 0
      ? `Kleuren: ${analysis.colorPalette.join(", ")}`
      : null,
    analysis.typography ? `Typografie: ${analysis.typography}` : null,
    analysis.imageStyle ? `Beeldstijl: ${analysis.imageStyle}` : null,
    analysis.visualAvoid.length > 0 ? `Visueel vermijden: ${analysis.visualAvoid.join("; ")}` : null,
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

export function brandColorsFromAnalysis(analysis: BrandAnalysis): string[] {
  return uniqueHexes([
    ...analysis.primaryColors.map((swatch) => swatch.hex),
    ...analysis.supportingColors.map((swatch) => swatch.hex),
    ...analysis.colorPalette,
  ], 6);
}

export function brandColorsFromStored(value: unknown): string[] {
  const parsed = brandAnalysisSchema.safeParse(value);
  if (!parsed.success) {
    return [];
  }
  return brandColorsFromAnalysis(parsed.data);
}

export function parsedBrandAnalysis(value: unknown): BrandAnalysis | null {
  const parsed = brandAnalysisSchema.safeParse(value);
  return parsed.success ? ensureVisualIdentity(parsed.data) : null;
}

export function formatVisualIdentity(
  analysis: BrandAnalysis | null,
  fallbackGuidelines?: string | null
): string | null {
  const composed = analysis ? composeVisualGuidelines(analysis) : "";
  const extra = (fallbackGuidelines ?? analysis?.visualGuidelines ?? "").trim();
  const parts = [composed, extra && extra !== composed ? extra : null].filter(Boolean);
  return parts.length > 0 ? parts.join("\n") : null;
}

export function withBrandVisualBrief(
  topic: string,
  generatedBrief: string,
  analysis: BrandAnalysis | null,
  fallbackGuidelines?: string | null
): string {
  const identity = formatVisualIdentity(analysis, fallbackGuidelines);
  const brief = generatedBrief.trim() || `Beeld bij ${topic}.`;
  if (!identity) {
    return brief;
  }
  const colors = analysis ? brandColorsFromAnalysis(analysis) : [];
  const hasColors =
    colors.length > 0 && colors.every((hex) => brief.toUpperCase().includes(hex.toUpperCase()));
  if (hasColors) {
    return brief;
  }
  return `${brief}\n\n${identity}`;
}

export function composeVisualGuidelines(analysis: Pick<
  BrandAnalysis,
  "primaryColors" | "supportingColors" | "neutralColors" | "typography" | "imageStyle" | "visualAvoid"
>): string {
  return [
    formatSwatchLine("Hoofdkleuren", analysis.primaryColors),
    formatSwatchLine("Steunkleuren", analysis.supportingColors),
    formatSwatchLine("Neutrals", analysis.neutralColors),
    analysis.typography ? `Typografie: ${analysis.typography}` : null,
    analysis.imageStyle ? `Beeldstijl: ${analysis.imageStyle}` : null,
    analysis.visualAvoid.length > 0 ? `Vermijd: ${analysis.visualAvoid.join("; ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function withSyncedPalette(analysis: BrandAnalysis): BrandAnalysis {
  const palette = uniqueHexes([
    ...analysis.primaryColors.map((swatch) => swatch.hex),
    ...analysis.supportingColors.map((swatch) => swatch.hex),
    ...analysis.neutralColors.map((swatch) => swatch.hex),
  ], 24);
  return {
    ...analysis,
    colorPalette: palette.length > 0 ? palette : analysis.colorPalette,
  };
}

export function ensureVisualIdentity(analysis: BrandAnalysis): BrandAnalysis {
  return hydrateVisualIdentity(analysis, analysis.colorPalette);
}

export function emptyBrandAnalysis(seed: Partial<BrandAnalysis> = {}): BrandAnalysis {
  return brandAnalysisSchema.parse({
    summary: seed.summary ?? "",
    industry: seed.industry ?? "",
    positioning: seed.positioning ?? "",
    toneOfVoice: seed.toneOfVoice ?? "",
    targetAudience: seed.targetAudience ?? "",
    goals: seed.goals ?? "",
    visualGuidelines: seed.visualGuidelines ?? "",
    dos: seed.dos ?? [],
    donts: seed.donts ?? [],
    colorPalette: seed.colorPalette ?? [],
    primaryColors: seed.primaryColors ?? [],
    supportingColors: seed.supportingColors ?? [],
    neutralColors: seed.neutralColors ?? [],
    imageStyle: seed.imageStyle ?? "",
    visualAvoid: seed.visualAvoid ?? [],
    typography: seed.typography ?? "",
    writingSamples: seed.writingSamples ?? [],
    voiceNotes: seed.voiceNotes ?? "",
    wordsWeUse: seed.wordsWeUse ?? [],
    wordsWeAvoid: seed.wordsWeAvoid ?? [],
    addressForm: seed.addressForm ?? "",
    audiences: seed.audiences ?? [],
    pillars: seed.pillars ?? [],
  });
}

export function mergeVisualIdentity(previous: BrandAnalysis, incoming: BrandAnalysis): BrandAnalysis {
  return withSyncedPalette({
    ...incoming,
    primaryColors: mergeSwatches(previous.primaryColors, incoming.primaryColors),
    supportingColors: mergeSwatches(previous.supportingColors, incoming.supportingColors),
    neutralColors: mergeSwatches(previous.neutralColors, incoming.neutralColors),
    typography: incoming.typography.trim() || previous.typography,
    imageStyle: incoming.imageStyle.trim() || previous.imageStyle,
    visualAvoid: uniqueStrings([...incoming.visualAvoid, ...previous.visualAvoid]),
  });
}

function hydrateVisualIdentity(analysis: BrandAnalysis, observedColors: string[]): BrandAnalysis {
  const cleaned = {
    ...analysis,
    primaryColors: cleanSwatches(analysis.primaryColors),
    supportingColors: cleanSwatches(analysis.supportingColors),
    neutralColors: cleanSwatches(analysis.neutralColors),
  };
  const hasStructured = cleaned.primaryColors.length + cleaned.supportingColors.length > 0;
  const fallback = uniqueHexes([...cleaned.colorPalette, ...observedColors], 10);
  const filled = hasStructured
    ? cleaned
    : {
        ...cleaned,
        primaryColors: fallback.slice(0, 2).map((hex, index) => toSwatch(hex, index === 0 ? "Hoofdkleur" : "Tweede hoofdkleur", "accenten")),
        supportingColors: fallback.slice(2, 5).map((hex) => toSwatch(hex, "Steunkleur", "")),
        neutralColors: fallback.slice(5, 8).map((hex) => toSwatch(hex, "Neutraal", "achtergrond")),
      };

  const next = withSyncedPalette(filled);
  if (next.visualGuidelines.trim().length < 12) {
    const composed = composeVisualGuidelines(next);
    return composed ? { ...next, visualGuidelines: composed } : next;
  }
  return next;
}

function cleanSwatches(swatches: ColorSwatch[]): ColorSwatch[] {
  return swatches
    .map((swatch) => ({
      hex: normalizeHex(swatch.hex) ?? swatch.hex.trim(),
      name: swatch.name.trim(),
      usage: swatch.usage.trim(),
    }))
    .filter((swatch) => swatch.hex.length >= 4);
}

function mergeSwatches(previous: ColorSwatch[], incoming: ColorSwatch[]): ColorSwatch[] {
  const result: ColorSwatch[] = [];
  const seen = new Set<string>();
  for (const swatch of incoming) {
    const key = (normalizeHex(swatch.hex) ?? swatch.hex.trim()).toUpperCase();
    if (!key || seen.has(key)) {
      continue;
    }
    const prior = previous.find((item) => (normalizeHex(item.hex) ?? item.hex.trim()).toUpperCase() === key);
    seen.add(key);
    result.push({
      hex: normalizeHex(swatch.hex) ?? swatch.hex,
      name: prior?.name.trim() || swatch.name.trim(),
      usage: prior?.usage.trim() || swatch.usage.trim(),
    });
  }
  for (const swatch of previous) {
    const key = (normalizeHex(swatch.hex) ?? swatch.hex.trim()).toUpperCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(swatch);
  }
  return result;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const item = value.trim();
    const key = item.toLowerCase();
    if (!item || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function formatSwatchLine(label: string, swatches: ColorSwatch[]): string | null {
  if (swatches.length === 0) {
    return null;
  }
  return `${label}: ${swatches
    .map((swatch) => {
      const name = swatch.name ? ` ${swatch.name}` : "";
      const usage = swatch.usage ? ` (${swatch.usage})` : "";
      return `${swatch.hex}${name}${usage}`;
    })
    .join("; ")}`;
}
