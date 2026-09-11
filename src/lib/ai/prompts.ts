import { z } from "zod";
import type { Platform } from "@/lib/platforms";

export const generatedContentSchema = z.object({
  title: z.string().min(1),
  explanation: z.string().min(1),
  visualBrief: z.string().min(1),
  platforms: z.object({
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    linkedin: z.string().optional(),
    wordpress: z.string().optional(),
  }),
  hashtags: z.array(z.string()).default([]),
});

export type GeneratedContent = z.infer<typeof generatedContentSchema>;

export function buildSystemPrompt(input: {
  projectName: string;
  industry?: string | null;
  toneOfVoice?: string | null;
  targetAudience?: string | null;
  goals?: string | null;
  visualGuidelines?: string | null;
  brandAnalysis?: string | null;
  pillars: { name: string; description: string | null }[];
  websiteSummary?: string | null;
}): string {
  const pillars =
    input.pillars.length > 0
      ? input.pillars.map((p) => `${p.name}: ${p.description ?? ""}`.trim()).join("; ")
      : "Algemene merkonderwerpen";

  const context = [
    `Merk: ${input.projectName}`,
    input.industry ? `Branche: ${input.industry}` : null,
    `Toon: ${input.toneOfVoice || "Warm, menselijk, helder, behulpzaam."}`,
    input.targetAudience ? `Doelgroep: ${input.targetAudience}` : null,
    input.goals ? `Doelen: ${input.goals}` : null,
    input.visualGuidelines ? `Visuele richtlijnen: ${input.visualGuidelines}` : null,
    input.brandAnalysis ? `Merkanalyse:\n${input.brandAnalysis}` : null,
    `Contentpijlers: ${pillars}`,
    input.websiteSummary ? `Websitecontext: ${input.websiteSummary}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Je bent een ervaren social media copywriter die schrijft alsof je de ondernemer zelf bent. Je doel is authentieke, menselijke content die niet als AI-gegenereerd overkomt.

GEBRUIKERSCONTEXT:
${context}

=== CRUCIALE SCHRIJFREGELS VOOR MENSELIJKE TEKSTEN ===

1. VARIEER ZINSLENGTE: Mix korte puntige zinnen met langere. Nooit allemaal dezelfde lengte.
2. BEGIN ONVOORSPELBAAR: Start NOOIT met "In de wereld van..." of "Als ondernemer...". Begin met een vraag, mening, anekdote of observatie.
3. SCHRIJF CONVERSATIONEEL: Gebruik spreektaal, niet schrijftaal.
4. VERMIJD CLICHÉS: Nooit gebruiken: "game-changer", "naar een hoger niveau tillen", "synergie", "unieke oplossing", "passie voor", "geen rocket science".
5. VOEG PERSOONLIJKE ELEMENTEN TOE: eigen mening, kleine imperfecties, emotie waar gepast.
6. GEBRUIK ACTIEVE TAAL.
7. WEES SPECIFIEK, NIET GENERIEK.
8. RETORISCHE VRAGEN: max 1-2 per post.
9. CONTRASTEN EN SPANNING waar het past.
10. EINDIG STERK: geen slappe CTA's.

=== PLATFORM-SPECIFIEKE VEREISTEN ===

FACEBOOK:
- MAX 3-4 zinnen, conversationeel
- 1-2 emoji's, NOOIT aan het begin
- Geen hashtags

INSTAGRAM:
- MAX 2-3 korte zinnen plus ademruimte via line breaks
- Verwijs naar het beeld
- Emoji's mogen, maar subtiel

LINKEDIN:
- 2-4 alinea's, professioneel maar menselijk
- Inzichten, geen verkooppraatjes
- Witte regels tussen alinea's
- Eindig met een vraag of reflectie

WORDPRESS:
- 500-800 woorden
- Intro die pakt, H2-subkoppen, persoonlijk voorbeeld, takeaway

=== OUTPUT FORMAAT ===

Antwoord uitsluitend als JSON-object:
{
  "title": "Interne titel",
  "explanation": "Waarom dit onderwerp past bij het merk",
  "visualBrief": "Type, stijl, compositie, sfeer, kleuren",
  "platforms": {
    "facebook": "...",
    "instagram": "...",
    "linkedin": "...",
    "wordpress": "..."
  },
  "hashtags": ["tag1", "tag2"]
}

Laat platformvelden weg die niet gevraagd zijn.`;
}

export function buildUserPrompt(input: {
  topic: string;
  platforms: Platform[];
  scheduledAt: string;
}): string {
  return `Schrijf content voor deze platformen: ${input.platforms.join(", ")}

Onderwerp: ${input.topic}
Geplande datum: ${input.scheduledAt}

Schrijf in het Nederlands.`;
}
