import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BrandAnalysis } from "@/lib/ai/brand-analysis";

function linesToList(value: string): string[] {
  return value
    .split(/\n/)
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

function csvToList(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function VoiceFields({
  analysis,
  onChange,
}: {
  analysis: BrandAnalysis;
  onChange: (patch: Partial<BrandAnalysis>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-[family-name:var(--font-heading)] text-[17px] font-semibold tracking-[-0.03em]">
          Schrijfstem
        </p>
        <p className="mt-1 text-sm text-[#635a52]">
          Posts kopiëren deze zinnen niet, maar gebruiken ze als ijkpunt. Pas ze aan als ze niet klinken als jullie
          website.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Voorbeeldzinnen van de website (één per regel, minstens 3)</Label>
        <Textarea
          className="min-h-36"
          value={analysis.writingSamples.join("\n")}
          onChange={(event) => onChange({ writingSamples: linesToList(event.target.value).slice(0, 8) })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Aanspreekvorm</Label>
          <Input
            value={analysis.addressForm}
            placeholder="je, jullie of u"
            onChange={(event) => onChange({ addressForm: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Ritme en stem</Label>
          <Input
            value={analysis.voiceNotes}
            placeholder="Kort, nuchter, geen humor…"
            onChange={(event) => onChange({ voiceNotes: event.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Woorden die dit merk gebruikt</Label>
          <Textarea
            className="min-h-24"
            value={analysis.wordsWeUse.join(", ")}
            onChange={(event) => onChange({ wordsWeUse: csvToList(event.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label>Woorden die dit merk mijdt</Label>
          <Textarea
            className="min-h-24"
            value={analysis.wordsWeAvoid.join(", ")}
            onChange={(event) => onChange({ wordsWeAvoid: csvToList(event.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}
