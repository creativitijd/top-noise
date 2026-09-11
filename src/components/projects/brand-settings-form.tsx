"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { brandAnalysisSchema, type BrandAnalysis } from "@/lib/ai/brand-analysis";
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
      const payload = (await response.json()) as { error?: string };
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
          throw new Error(detail.error ?? "Stylboek uploaden mislukt.");
        }
      }
      toast.success("Merkprofiel opgeslagen.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Opslaan mislukt.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
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
      <Field label="Stylboek">
        <Input
          type="file"
          accept=".pdf,image/png,image/jpeg,image/webp"
          onChange={(event) => setStylebook(event.target.files?.[0] ?? null)}
        />
        {project.stylebook_path ? (
          <p className="text-sm text-muted-foreground">Er is al een stylboek gekoppeld{stylebook ? "; je upload vervangt die." : "."}</p>
        ) : null}
      </Field>
      <Button type="button" variant="outline" disabled={analyzing} onClick={() => void runAnalysis()}>
        {analyzing ? "Analyseren…" : "Opnieuw analyseren"}
      </Button>
      {analysis ? (
        <div className="rounded-xl bg-muted/60 p-4 text-sm">
          <p className="font-medium">Laatste analyse</p>
          <p className="mt-1 text-muted-foreground">{analysis.summary}</p>
        </div>
      ) : null}
      <Field label="Toon">
        <Textarea
          value={form.toneOfVoice}
          onChange={(event) => setForm({ ...form, toneOfVoice: event.target.value })}
        />
      </Field>
      <Field label="Doelgroep">
        <Textarea
          value={form.targetAudience}
          onChange={(event) => setForm({ ...form, targetAudience: event.target.value })}
        />
      </Field>
      <Field label="Doelen">
        <Textarea value={form.goals} onChange={(event) => setForm({ ...form, goals: event.target.value })} />
      </Field>
      <Field label="Visuele richtlijnen">
        <Textarea
          value={form.visualGuidelines}
          onChange={(event) => setForm({ ...form, visualGuidelines: event.target.value })}
        />
      </Field>
      <Field label="Tijdzone">
        <Input
          value={form.timezone}
          onChange={(event) => setForm({ ...form, timezone: event.target.value })}
        />
      </Field>
      <div>
        <p className="mb-2 text-sm font-medium">Contentpijlers</p>
        <ul className="space-y-1 text-sm text-muted-foreground">
          {pillars.map((pillar) => (
            <li key={pillar.id}>
              <span className="text-foreground">{pillar.name}</span>
              {pillar.description ? ` — ${pillar.description}` : ""}
            </li>
          ))}
        </ul>
      </div>
      <Button disabled={pending} onClick={() => void save()}>
        {pending ? "Opslaan…" : "Opslaan"}
      </Button>
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
