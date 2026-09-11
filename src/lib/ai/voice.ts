import { brandAnalysisSchema, type BrandAnalysis } from "@/lib/ai/brand-analysis";
import type { GeneratedContent } from "@/lib/ai/prompts";

export type VoiceProfile = {
  toneOfVoice: string;
  writingSamples: string[];
  voiceNotes: string;
  wordsWeUse: string[];
  wordsWeAvoid: string[];
  addressForm: string;
};

const AI_TELLS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /in de wereld van/i, label: "openingscliché" },
  { pattern: /als ondernemer/i, label: "openingscliché" },
  { pattern: /in deze snel veranderende/i, label: "openingscliché" },
  { pattern: /het is geen geheim dat/i, label: "openingscliché" },
  { pattern: /ontdek de kracht/i, label: "marketingcliché" },
  { pattern: /naar een hoger niveau/i, label: "marketingcliché" },
  { pattern: /game-?changer/i, label: "marketingcliché" },
  { pattern: /unieke (oplossing|kans|ervaring)/i, label: "marketingcliché" },
  { pattern: /passie voor/i, label: "marketingcliché" },
  { pattern: /synergie/i, label: "jargon" },
  { pattern: /bij ons staat .{3,40} centraal/i, label: "bedrijfscliché" },
  { pattern: /of je nu .{3,40} of/i, label: "AI-constructie" },
  { pattern: /niet alleen .{3,40}, maar ook/i, label: "AI-constructie" },
  { pattern: /klaar om te (groeien|starten|ontdekken)/i, label: "CTA-cliché" },
  { pattern: /wij geloven dat/i, label: "AI-overtuiging" },
  { pattern: /laten we (eens )?kijken/i, label: "AI-overgang" },
  { pattern: /in today's|unlock your|delve|leverage|empower|tapestry|landscape|furthermore|moreover/i, label: "Engels AI-woord" },
];

export function voiceFromAnalysis(
  analysis: BrandAnalysis | null,
  toneOfVoice?: string | null
): VoiceProfile {
  return {
    toneOfVoice: (toneOfVoice || analysis?.toneOfVoice || "").trim(),
    writingSamples: analysis?.writingSamples ?? [],
    voiceNotes: analysis?.voiceNotes ?? "",
    wordsWeUse: analysis?.wordsWeUse ?? [],
    wordsWeAvoid: analysis?.wordsWeAvoid ?? [],
    addressForm: analysis?.addressForm ?? "",
  };
}

export function voiceFromStored(analysis: unknown, toneOfVoice?: string | null): VoiceProfile {
  const parsed = brandAnalysisSchema.safeParse(analysis);
  return voiceFromAnalysis(parsed.success ? parsed.data : null, toneOfVoice);
}

export function buildVoicePrompt(voice: VoiceProfile): string {
  const samples =
    voice.writingSamples.length > 0
      ? `Voorbeeldzinnen van de website (ijkpunt, niet letterlijk herhalen):\n${voice.writingSamples
          .map((sample) => `- ${sample}`)
          .join("\n")}`
      : "Er zijn nog geen voorbeeldzinnen. Schrijf dan extra nuchter en kort, alsof een mens dit tussendoor typt. Geen brochuretaal.";

  return [
    "=== MERKSTEM (dit gaat boven alles) ===",
    voice.toneOfVoice ? `Toonregels: ${voice.toneOfVoice}` : null,
    voice.addressForm ? `Aanspreekvorm: ${voice.addressForm}` : null,
    voice.voiceNotes ? `Ritme en stem: ${voice.voiceNotes}` : null,
    voice.wordsWeUse.length > 0 ? `Woorden die dit merk wél gebruikt: ${voice.wordsWeUse.join(", ")}` : null,
    voice.wordsWeAvoid.length > 0 ? `Woorden die dit merk mijdt: ${voice.wordsWeAvoid.join(", ")}` : null,
    samples,
    "Schrijf alsof dezelfde persoon die de website schreef nu een social post typt.",
    "Kopieer geen AI-cadans: geen drie even lange zinnen, geen em-dashes, geen 'niet alleen… maar ook…'.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function aiTellReasons(text: string): string[] {
  const reasons = new Set<string>();
  for (const tell of AI_TELLS) {
    if (tell.pattern.test(text)) {
      reasons.add(tell.label);
    }
  }
  if ((text.match(/—/g) ?? []).length >= 2) {
    reasons.add("em-dashes");
  }
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 20);
  if (sentences.length >= 3) {
    const lengths = sentences.slice(0, 4).map((sentence) => sentence.length);
    const max = Math.max(...lengths);
    const min = Math.min(...lengths);
    if (max - min <= 12) {
      reasons.add("gelijke zinslengte");
    }
  }
  return [...reasons];
}

export function needsHumanizePass(content: GeneratedContent): boolean {
  return Object.values(content.platforms).some((text) => text && aiTellReasons(text).length > 0);
}
