"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatAudiences, type AudienceSegment } from "@/lib/ai/brand-analysis";
import { cn } from "@/lib/utils";

export function AudienceEditor({
  audiences,
  onChange,
}: {
  audiences: AudienceSegment[];
  onChange: (audiences: AudienceSegment[]) => void;
}) {
  if (audiences.length === 0) {
    return null;
  }

  function update(index: number, patch: Partial<AudienceSegment>) {
    onChange(audiences.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Doelgroepbepaling</p>
        <p className="mt-1 text-sm text-[#635a52]">
          Primair is voor wie je vooral schrijft. Secundair mag meeliften in de kalender.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {audiences.map((audience, index) => (
          <div
            key={index}
            className={cn(
              "space-y-3 rounded-[18px] border p-4",
              audience.primary
                ? "border-[rgb(79_134_55_/_28%)] bg-[#f1f6e7]"
                : "border-[rgb(31_27_24_/_8%)] bg-white"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
                  audience.primary ? "bg-[#4f8637] text-white" : "bg-[rgb(31_27_24_/_8%)] text-[#635a52]"
                )}
              >
                {audience.primary ? "Primair" : "Secundair"}
              </span>
              <label className="flex items-center gap-2 text-xs text-[#635a52]">
                <input
                  type="checkbox"
                  checked={audience.primary}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    onChange(
                      audiences.map((item, itemIndex) => ({
                        ...item,
                        primary: checked ? itemIndex === index : itemIndex === index ? false : item.primary,
                      }))
                    );
                  }}
                />
                Primaire groep
              </label>
            </div>
            <Field label="Naam">
              <Input value={audience.name} onChange={(event) => update(index, { name: event.target.value })} />
            </Field>
            <Field label="Rol of fase">
              <Input value={audience.role} onChange={(event) => update(index, { role: event.target.value })} />
            </Field>
            <Field label="Wie is dit?">
              <Textarea value={audience.who} onChange={(event) => update(index, { who: event.target.value })} />
            </Field>
            <Field label="Wat willen ze?">
              <Textarea value={audience.goals} onChange={(event) => update(index, { goals: event.target.value })} />
            </Field>
            <Field label="Frustraties">
              <Textarea
                value={audience.frustrations}
                onChange={(event) => update(index, { frustrations: event.target.value })}
              />
            </Field>
            <Field label="Taal en toon">
              <Textarea value={audience.language} onChange={(event) => update(index, { language: event.target.value })} />
            </Field>
            <Field label="Kanalen (komma)">
              <Input
                value={audience.channels.join(", ")}
                onChange={(event) =>
                  update(index, {
                    channels: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
            <Field label="Vermijd in content">
              <Textarea value={audience.avoid} onChange={(event) => update(index, { avoid: event.target.value })} />
            </Field>
          </div>
        ))}
      </div>
    </div>
  );
}

export function audiencesToSummary(audiences: AudienceSegment[], fallback: string): string {
  return audiences.length > 0 ? formatAudiences(audiences) : fallback;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-[#635a52]">{label}</Label>
      {children}
    </div>
  );
}
