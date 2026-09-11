import { z } from "zod";
import { completeChatJson, type ChatContentPart } from "@/lib/ai/generate";

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
        input.stylebookText ? input.stylebookText : "Geen stylboektekst.",
        "Leid uit alle bronnen een bruikbaar merkprofiel voor social content af. Verzin geen feiten die nergens in de bronnen staan; markeer aannames kort als aanname.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
    ...(input.images ?? []),
  ];

  const parsed = await completeChatJson({
    systemPrompt: `Je bent een merkanalyst en brand strategist. Je maakt een praktisch profiel waarmee social content on-brand blijft.

Antwoord uitsluitend als JSON:
{
  "summary": "korte merksamenvatting in 4-8 zinnen",
  "industry": "branche",
  "positioning": "hoe dit merk zich onderscheidt",
  "toneOfVoice": "concrete toonregels, met voorbeelden van woorden die wel/niet passen",
  "targetAudience": "primaire doelgroep",
  "goals": "communicatie- en groeidoelen",
  "visualGuidelines": "kleuren, typografie, beeldstijl, compositie, wat te vermijden",
  "dos": ["..."],
  "donts": ["..."],
  "colorPalette": ["#hex of kleurnaam"],
  "typography": "fonts en hiërarchie",
  "pillars": [{"name":"...","description":"..."}]
}

Schrijf in het Nederlands. Geef 3 tot 6 contentpijlers.`,
    userContent: parts,
    model: process.env.AI_ANALYSIS_MODEL ?? process.env.AI_MODEL ?? "gpt-4o",
    temperature: 0.25,
  });

  return brandAnalysisSchema.parse(parsed);
}

export function formatBrandAnalysis(analysis: BrandAnalysis): string {
  return [
    analysis.summary,
    `Positionering: ${analysis.positioning}`,
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
