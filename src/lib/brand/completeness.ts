export type BrandChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type BrandProfileInput = {
  name: string;
  websiteUrl?: string | null;
  industry?: string | null;
  toneOfVoice?: string | null;
  targetAudience?: string | null;
  goals?: string | null;
  visualGuidelines?: string | null;
  stylebookPath?: string | null;
  hasStylebookFile?: boolean;
  audienceCount?: number;
  writingSampleCount?: number;
  pillarCount: number;
};

function filled(value: string | null | undefined, min = 8): boolean {
  return (value ?? "").trim().length >= min;
}

export function brandChecklist(input: BrandProfileInput): BrandChecklistItem[] {
  const hasSource = filled(input.websiteUrl, 8) || Boolean(input.stylebookPath) || Boolean(input.hasStylebookFile);
  return [
    { id: "name", label: "Merknaam", done: filled(input.name, 2) },
    { id: "source", label: "Website of styleguide", done: hasSource },
    { id: "industry", label: "Branche", done: filled(input.industry, 2) },
    { id: "tone", label: "Toon", done: filled(input.toneOfVoice, 16) },
    { id: "voice", label: "Schrijfstem", done: (input.writingSampleCount ?? 0) >= 3 },
    { id: "audience", label: "Doelgroep", done: filled(input.targetAudience, 16) || (input.audienceCount ?? 0) > 0 },
    { id: "goals", label: "Doelen", done: filled(input.goals, 12) },
    { id: "visual", label: "Visuele richtlijnen", done: filled(input.visualGuidelines, 12) },
    { id: "pillars", label: "Contentpijlers", done: input.pillarCount >= 3 },
  ];
}

export function brandProgress(input: BrandProfileInput) {
  const items = brandChecklist(input);
  const done = items.filter((item) => item.done).length;
  const total = items.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { items, done, total, percent, remaining: items.filter((item) => !item.done) };
}
