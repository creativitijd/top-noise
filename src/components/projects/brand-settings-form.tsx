"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { brandAnalysisSchema, type BrandAnalysis } from "@/lib/ai/brand-analysis";
import { brandProgress } from "@/lib/brand/completeness";
import { AudienceEditor, audiencesToSummary } from "@/components/projects/audience-editor";
import { BrandProgress } from "@/components/projects/brand-progress";
import { VoiceFields } from "@/components/projects/voice-fields";
import type { ContentPillar, Project } from "@/types/database";

export function BrandSettingsForm({
  project,
  pillars,
}: {
  project: Project;
  pillars: ContentPillar[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [stylebook, setStylebook] = useState<File | null>(null);
  const stored = brandAnalysisSchema.safeParse(project.brand_analysis);
  const [analysis, setAnalysis] = useState<BrandAnalysis | null>(stored.success ? stored.data : null);
  const [form, setForm] = useState({
    name: project.name,
    websiteUrl: project.website_url ?? "",
    industry: project.industry ?? "",
    toneOfVoice: project.tone_of_voice ?? "",
    targetAudience: project.target_audience ?? "",
    goals: project.goals ?? "",
    visualGuidelines: project.visual_guidelines ?? "",
    timezone: project.timezone,
  });

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const data = new FormData();
      data.set("name", form.name);
      data.set("industry", form.industry);
      data.set("websiteUrl", form.websiteUrl);
      if (stylebook) {
        data.set("stylebook", stylebook);
      }
      const response = await fetch("/api/ai/analyze-brand", { method: "POST", body: data });
      const payload = (await response.json()) as { analysis?: BrandAnalysis; error?: string };
      if (!response.ok || !payload.analysis) {
        throw new Error(payload.error ?? "Analyse mislukt.");
      }
      setAnalysis(payload.analysis);
      setForm((current) => ({
        ...current,
        industry: payload.analysis?.industry ?? current.industry,
        toneOfVoice: payload.analysis?.toneOfVoice ?? current.toneOfVoice,
        targetAudience: payload.analysis?.targetAudience ?? current.targetAudience,
        goals: payload.analysis?.goals ?? current.goals,
        visualGuidelines: payload.analysis?.visualGuidelines ?? current.visualGuidelines,
      }));
      toast.success("Merkanalyse bijgewerkt. Controleer en sla op.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analyse mislukt.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function save() {
    setPending(true);
    try {
      const response = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.id, ...form, brandAnalysis: analysis ?? undefined }),
      });
      const payload = (await response.json()) as { error?: string; warning?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Opslaan mislukt.");
      }
      if (stylebook) {
        const data = new FormData();
        data.set("projectId", project.id);
        data.set("stylebook", stylebook);
        const upload = await fetch("/api/projects/stylebook", { method: "POST", body: data });
        if (!upload.ok) {
          const detail = (await upload.json()) as { error?: string };
          throw new Error(detail.error ?? "Styleguide uploaden mislukt.");
        }
      }
      if (payload.warning) {
        toast.warning(payload.warning);
      } else {
        toast.success("Merkprofiel opgeslagen.");
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Opslaan mislukt.");
    } finally {
      setPending(false);
    }
  }

  const progress = brandProgress({
    name: form.name,
    websiteUrl: form.websiteUrl,
    industry: form.industry,
    toneOfVoice: form.toneOfVoice,
    targetAudience: form.targetAudience,
    goals: form.goals,
    visualGuidelines: form.visualGuidelines,
    stylebookPath: project.stylebook_path,
    hasStylebookFile: Boolean(stylebook),
    audienceCount: analysis?.audiences.length ?? 0,
    writingSampleCount: analysis?.writingSamples.filter((sample) => sample.trim().length >= 24).length ?? 0,
    pillarCount: pillars.length,
  });

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <BrandProgress items={progress.items} done={progress.done} total={progress.total} percent={progress.percent} />
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-4 rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-5">
          <Field label="Naam">
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Field>
          <Field label="Website">
            <Input
              type="url"
              value={form.websiteUrl}
              onChange={(event) => setForm({ ...form, websiteUrl: event.target.value })}
            />
          </Field>
          <Field label="Branche">
            <Input
              value={form.industry}
              onChange={(event) => setForm({ ...form, industry: event.target.value })}
            />
          </Field>
          <Field label="Styleguide">
            <Input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={(event) => setStylebook(event.target.files?.[0] ?? null)}
            />
            {project.stylebook_path ? (
              <p className="text-sm text-muted-foreground">
                Er is al een styleguide gekoppeld{stylebook ? "; je upload vervangt die." : "."}
              </p>
            ) : null}
          </Field>
          <Field label="Tijdzone">
            <Input
              value={form.timezone}
              onChange={(event) => setForm({ ...form, timezone: event.target.value })}
            />
          </Field>
          <Button type="button" variant="outline" disabled={analyzing} onClick={() => void runAnalysis()}>
            {analyzing ? "Analyseren…" : "Opnieuw analyseren"}
          </Button>
        </section>
        <section className="space-y-4 rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-5">
          {analysis ? (
            <div className="rounded-xl bg-muted/60 p-4 text-sm">
              <p className="font-medium">Laatste analyse</p>
              <p className="mt-1 text-muted-foreground">{analysis.summary}</p>
            </div>
          ) : null}
          <Field label="Toon">
            <Textarea
              className="min-h-32"
              value={form.toneOfVoice}
              onChange={(event) => {
                const toneOfVoice = event.target.value;
                setForm({ ...form, toneOfVoice });
                setAnalysis((current) => (current ? { ...current, toneOfVoice } : current));
              }}
            />
          </Field>
          <Field label="Doelgroep (samenvatting)">
            <Textarea
              className="min-h-32"
              value={form.targetAudience}
              onChange={(event) => setForm({ ...form, targetAudience: event.target.value })}
            />
          </Field>
        </section>
      </div>
      {analysis ? (
        <section className="space-y-4 rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-5">
          <VoiceFields
            analysis={analysis}
            onChange={(patch) => setAnalysis((current) => (current ? { ...current, ...patch } : current))}
          />
        </section>
      ) : (
        <section className="rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-5 text-sm text-[#635a52]">
          Analyseer de website om voorbeeldzinnen te halen. Zonder die stem klinken posts snel als AI.
        </section>
      )}
      {analysis ? (
        <section className="space-y-4 rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-5">
          <AudienceEditor
            audiences={analysis.audiences}
            onChange={(audiences) => {
              setAnalysis((current) => (current ? { ...current, audiences } : current));
              setForm((current) => ({
                ...current,
                targetAudience: audiencesToSummary(audiences, current.targetAudience),
              }));
            }}
          />
          {analysis.audiences.length === 0 ? (
            <p className="text-sm text-[#635a52]">
              Deze analyse heeft nog geen uitgewerkte doelgroepen. Klik op Opnieuw analyseren voor een doelgroepbepaling.
            </p>
          ) : null}
        </section>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-4 rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-5">
          <Field label="Doelen">
            <Textarea
              className="min-h-32"
              value={form.goals}
              onChange={(event) => setForm({ ...form, goals: event.target.value })}
            />
          </Field>
        </section>
        <section className="space-y-4 rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-5">
          <Field label="Visuele richtlijnen">
            <Textarea
              className="min-h-32"
              value={form.visualGuidelines}
              onChange={(event) => setForm({ ...form, visualGuidelines: event.target.value })}
            />
          </Field>
        </section>
      </div>
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-5">
        <div>
          <p className="mb-2 text-sm font-medium">Contentpijlers</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {pillars.map((pillar) => (
              <li key={pillar.id}>
                <span className="text-foreground">{pillar.name}</span>
                {pillar.description ? ` — ${pillar.description}` : ""}
              </li>
            ))}
            {pillars.length === 0 ? <li>Nog geen pijlers. Analyseer het merk of vul ze bij onboarding in.</li> : null}
          </ul>
        </div>
        <Button disabled={pending} onClick={() => void save()}>
          {pending ? "Opslaan…" : "Opslaan"}
        </Button>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
