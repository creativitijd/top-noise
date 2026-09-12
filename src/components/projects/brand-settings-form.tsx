"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileImage, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  brandAnalysisSchema,
  composeVisualGuidelines,
  emptyBrandAnalysis,
  ensureVisualIdentity,
  mergeVisualIdentity,
  type BrandAnalysis,
} from "@/lib/ai/brand-analysis";
import { brandProgress } from "@/lib/brand/completeness";
import { AudienceEditor, audiencesToSummary } from "@/components/projects/audience-editor";
import { BrandProgress } from "@/components/projects/brand-progress";
import { VisualFields } from "@/components/projects/visual-fields";
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
  const [analysis, setAnalysis] = useState<BrandAnalysis>(() =>
    stored.success
      ? ensureVisualIdentity(stored.data)
      : emptyBrandAnalysis({
          industry: project.industry ?? "",
          toneOfVoice: project.tone_of_voice ?? "",
          targetAudience: project.target_audience ?? "",
          goals: project.goals ?? "",
          visualGuidelines: project.visual_guidelines ?? "",
        })
  );
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
      data.set("projectId", project.id);
      if (stylebook) {
        data.set("stylebook", stylebook);
      }
      const response = await fetch("/api/ai/analyze-brand", { method: "POST", body: data });
      const payload = (await response.json()) as { analysis?: BrandAnalysis; error?: string };
      if (!response.ok || !payload.analysis) {
        throw new Error(payload.error ?? "Analyse mislukt.");
      }
      const next = payload.analysis;
      setAnalysis((current) => mergeVisualIdentity(current, next));
      setForm((current) => ({
        ...current,
        industry: next.industry || current.industry,
        toneOfVoice: next.toneOfVoice || current.toneOfVoice,
        targetAudience: next.targetAudience || current.targetAudience,
        goals: next.goals || current.goals,
        visualGuidelines: next.visualGuidelines || current.visualGuidelines,
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
        body: JSON.stringify({
          id: project.id,
          ...form,
          visualGuidelines: form.visualGuidelines.trim() || composeVisualGuidelines(analysis),
          brandAnalysis: analysis,
        }),
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
    audienceCount: analysis.audiences.length,
    writingSampleCount: analysis.writingSamples.filter((sample) => sample.trim().length >= 24).length,
    colorCount: analysis.primaryColors.length + analysis.supportingColors.length,
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
            {project.stylebook_path ? (
              <a
                href={`/api/projects/stylebook?projectId=${project.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-[rgb(31_27_24_/_10%)] bg-[#fafaf9] px-3.5 py-3 hover:border-[#4f8637]"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#fbf1e8] text-[#b8562c]">
                  {stylebookKind(project.stylebook_path) === "pdf" ? (
                    <FileText className="size-5" />
                  ) : (
                    <FileImage className="size-5" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[#1f1b18]">
                    {stylebookFileName(project.stylebook_path)}
                  </span>
                  <span className="text-[12.5px] font-medium text-[#3f6b2b]">Openen</span>
                </span>
              </a>
            ) : null}
            <Input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={(event) => setStylebook(event.target.files?.[0] ?? null)}
            />
            {stylebook ? (
              <p className="text-sm text-[#635a52]">
                {stylebook.name} vervangt het huidige bestand bij opslaan.
              </p>
            ) : project.stylebook_path ? (
              <p className="text-sm text-[#8b8079]">Kies een bestand om de huidige styleguide te vervangen.</p>
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
      {analysis.summary.trim() ? (
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
                setAnalysis((current) => ({ ...current, toneOfVoice }));
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
      {analysis.writingSamples.some((sample) => sample.trim().length >= 24) ? (
        <section className="space-y-4 rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-5">
          <VoiceFields analysis={analysis} onChange={(patch) => setAnalysis((current) => ({ ...current, ...patch }))} />
        </section>
      ) : (
        <section className="rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-5 text-sm text-[#635a52]">
          Analyseer de website om voorbeeldzinnen te halen. Zonder die stem klinken posts snel als AI.
        </section>
      )}
      <section className="space-y-4 rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-5">
        <VisualFields analysis={analysis} onChange={(patch) => setAnalysis((current) => ({ ...current, ...patch }))} />
      </section>
      <section className="space-y-4 rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-5">
        <AudienceEditor
          audiences={analysis.audiences}
          onChange={(audiences) => {
            setAnalysis((current) => ({ ...current, audiences }));
            setForm((current) => ({
              ...current,
              targetAudience: audiencesToSummary(audiences, current.targetAudience),
            }));
          }}
        />
        {analysis.audiences.length === 0 ? (
          <p className="text-sm text-[#635a52]">
            Nog geen uitgewerkte doelgroepen. Klik op Opnieuw analyseren, of vul ze later aan.
          </p>
        ) : null}
      </section>
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
          <Field label="Samenvatting visuele richtlijnen">
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

function stylebookKind(path: string): "pdf" | "image" {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return ["png", "jpg", "jpeg", "webp"].includes(ext) ? "image" : "pdf";
}

function stylebookFileName(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "pdf";
  const safe = ext === "jpeg" ? "jpg" : ext;
  return `Styleguide.${safe}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
