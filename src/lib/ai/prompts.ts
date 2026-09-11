import { z } from "zod";
import { buildVoicePrompt, type VoiceProfile } from "@/lib/ai/voice";
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
  voice: VoiceProfile;
}): string {
  const pillars =
    input.pillars.length > 0
      ? input.pillars.map((p) => `${p.name}: ${p.description ?? ""}`.trim()).join("; ")
      : "Algemene merkonderwerpen";

  const context = [
    `Merk: ${input.projectName}`,
    input.industry ? `Branche: ${input.industry}` : null,
    input.targetAudience ? `Doelgroep: ${input.targetAudience}` : null,
    input.goals ? `Doelen: ${input.goals}` : null,
    input.visualGuidelines ? `Visuele richtlijnen: ${input.visualGuidelines}` : null,
    input.brandAnalysis ? `Merkanalyse:\n${input.brandAnalysis}` : null,
    `Contentpijlers: ${pillars}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `Je bent geen AI-tekstmachine. Je schrijft alsof je de ondernemer zelf bent, in de stem van de website.

GEBRUIKERSCONTEXT:
${context}

${buildVoicePrompt(input.voice)}

Schrijf in de eerste plaats voor de primaire doelgroep. Gebruik hun taal, hun frustraties en wat ze willen bereiken. Secundaire groepen mogen meeliften, maar forceer geen generieke boodschap voor iedereen.

=== CRUCIALE SCHRIJFREGELS VOOR MENSELIJKE TEKSTEN ===

1. VARIEER ZINSLENGTE: Mix korte puntige zinnen met langere. Nooit allemaal dezelfde lengte.
2. BEGIN ONVOORSPELBAAR: Start NOOIT met "In de wereld van...", "Als ondernemer...", "Wij geloven dat..." of "Het is geen geheim dat...". Begin met een observatie, een mening, een klein feit of een vraag die iemand echt zou stellen.
3. SCHRIJF CONVERSATIONEEL: Alsof je het aan één persoon vertelt, niet aan een zaal.
4. VERMIJD CLICHÉS: Nooit gebruiken: "game-changer", "naar een hoger niveau tillen", "synergie", "unieke oplossing", "passie voor", "ontdek de kracht", "bij ons staat ... centraal", "niet alleen ... maar ook ...".
5. WEES SPECIFIEK: noem wat het merk écht doet, geen vage beloftes.
6. RETORISCHE VRAGEN: max 1 per post, en alleen als de website dat ook doet.
7. EINDIG STERK: geen slappe CTA's als "Ontdek meer" of "Klaar om te groeien?".
8. Geen em-dashes (—). Geen Engels modewoord.

=== PLATFORM-SPECIFIEKE VEREISTEN ===

FACEBOOK:
- MAX 3-4 zinnen, conversationeel
- 1-2 emoji's alleen als de merkstem dat toelaat, NOOIT aan het begin
- Geen hashtags

INSTAGRAM:
- MAX 2-3 korte zinnen plus ademruimte via line breaks
- Verwijs naar het beeld
- Emoji's mogen, maar alleen als de website of merkstem dat ook doet

LINKEDIN:
- 2-4 alinea's, professioneel maar menselijk, in de merkstem, niet in LinkedIn-jargon
- Inzichten, geen verkooppraatjes
- Witte regels tussen alinea's
- Eindig met een vraag of reflectie als dat bij het merk past

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

Schrijf in het Nederlands, in de merkstem hierboven. Klinkt het als ChatGPT, dan is het fout.`;
}

export function buildRewriteSystemPrompt(input: {
  platformLabel: string;
  instruction: string;
  voice: VoiceProfile;
}): string {
  return `Je herschrijft social posts in het Nederlands voor ${input.platformLabel}.
${input.instruction}

Blijf in de merkstem. Een toonverschuiving (warmer, strakker, speelser) mag, maar niet ten koste van hoe dit merk écht klinkt.

${buildVoicePrompt(input.voice)}

Geen aanhalingstekens om de hele tekst. Behoud hashtags als die er zijn, of voeg er max 2 toe als het Instagram is.
Antwoord uitsluitend als JSON: { "content": "..." }`;
}
