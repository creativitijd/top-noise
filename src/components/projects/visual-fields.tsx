import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { withSyncedPalette, type BrandAnalysis } from "@/lib/ai/brand-analysis";
import { emptySwatch, normalizeHex, type ColorSwatch } from "@/lib/brand/colors";

function linesToList(value: string): string[] {
  return value
    .split(/\n/)
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

function pickerHex(value: string): string {
  return normalizeHex(value) ?? "#CCCCCC";
}

export function VisualFields({
  analysis,
  onChange,
}: {
  analysis: BrandAnalysis;
  onChange: (patch: Partial<BrandAnalysis>) => void;
}) {
  function patchVisual(partial: Partial<BrandAnalysis>) {
    const next = withSyncedPalette({ ...analysis, ...partial });
    onChange({
      ...partial,
      colorPalette: next.colorPalette,
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-[family-name:var(--font-heading)] text-[17px] font-semibold tracking-[-0.03em]">
          Visuele aandachtspunten
        </p>
        <p className="mt-1 text-sm text-[#635a52]">
          Uit de styleguide of website, en zelf aan te vullen. Voeg hoofdkleuren, steunkleuren en neutrals toe of pas ze
          aan. Beeldgeneratie gebruikt dit palet.
        </p>
      </div>
      <ColorGroup
        title="Hoofdkleuren"
        hint="Logo, knoppen, belangrijkste accent"
        addLabel="+ hoofdkleur"
        colors={analysis.primaryColors}
        onChange={(primaryColors) => patchVisual({ primaryColors })}
      />
      <ColorGroup
        title="Steunkleuren"
        hint="Highlights, illustraties, extra nadruk"
        addLabel="+ steunkleur"
        colors={analysis.supportingColors}
        onChange={(supportingColors) => patchVisual({ supportingColors })}
      />
      <ColorGroup
        title="Neutrals"
        hint="Achtergrond, tekst, vlakken"
        addLabel="+ neutraal"
        colors={analysis.neutralColors}
        onChange={(neutralColors) => patchVisual({ neutralColors })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Typografie</Label>
          <Input
            value={analysis.typography}
            placeholder="Koppen en lopende tekst"
            onChange={(event) => patchVisual({ typography: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Beeldstijl</Label>
          <Input
            value={analysis.imageStyle}
            placeholder="Fotografisch, warm licht…"
            onChange={(event) => patchVisual({ imageStyle: event.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Visueel vermijden (één per regel)</Label>
        <Textarea
          className="min-h-24"
          value={analysis.visualAvoid.join("\n")}
          placeholder="Geen neon, geen stockfoto-glimlach…"
          onChange={(event) => patchVisual({ visualAvoid: linesToList(event.target.value) })}
        />
      </div>
    </div>
  );
}

function ColorGroup({
  title,
  hint,
  addLabel,
  colors,
  onChange,
}: {
  title: string;
  hint: string;
  addLabel: string;
  colors: ColorSwatch[];
  onChange: (colors: ColorSwatch[]) => void;
}) {
  function update(index: number, patch: Partial<ColorSwatch>) {
    onChange(colors.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-[12.5px] text-[#8b8079]">{hint}</p>
      </div>
      <div className="flex flex-col gap-2">
        {colors.map((color, index) => {
          const hex = normalizeHex(color.hex);
          return (
            <div key={`${title}-${index}`} className="flex flex-wrap items-center gap-2">
              <label
                className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-[10px] border border-[rgb(31_27_24_/_12%)]"
                title="Kleur kiezen"
              >
                <span className="absolute inset-0" style={{ background: hex ?? "#f5f5f4" }} />
                <input
                  type="color"
                  value={pickerHex(color.hex)}
                  onChange={(event) => update(index, { hex: event.target.value.toUpperCase() })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              <Input
                value={color.hex}
                placeholder="#RRGGBB"
                className="w-[7.5rem]"
                onChange={(event) => update(index, { hex: event.target.value })}
              />
              <Input
                value={color.name}
                placeholder="Naam"
                className="min-w-[8rem] flex-1"
                onChange={(event) => update(index, { name: event.target.value })}
              />
              <Input
                value={color.usage}
                placeholder="Gebruik"
                className="min-w-[8rem] flex-1"
                onChange={(event) => update(index, { usage: event.target.value })}
              />
              <button
                type="button"
                onClick={() => onChange(colors.filter((_, itemIndex) => itemIndex !== index))}
                className="text-[12.5px] font-semibold text-[#8b8079] hover:text-[#a8461f]"
              >
                Weg
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => onChange([...colors, emptySwatch()])}
          className="self-start rounded-full border border-dashed border-[rgb(31_27_24_/_20%)] px-3 py-1.5 text-[12.5px] font-semibold text-[#635a52] hover:border-[#4f8637] hover:text-[#4f8637]"
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}
