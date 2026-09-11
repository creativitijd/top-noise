"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BrandAnalysis } from "@/lib/ai/brand-analysis";

const defaultPillars = [
  { name: "Educatie", description: "Uitleg en inzichten uit de praktijk" },
  { name: "Verhalen", description: "Achter de schermen en klantmomenten" },
  { name: "Aanbod", description: "Wat je maakt en voor wie het bedoeld is" },
];

export function ProjectOnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [stylebook, setStylebook] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<BrandAnalysis | null>(null);
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [goals, setGoals] = useState("");
  const [visualGuidelines, setVisualGuidelines] = useState("");
  const [pillars, setPillars] = useState(defaultPillars);

  function applyAnalysis(result: BrandAnalysis) {
    setAnalysis(result);
    setIndustry(result.industry);
    setToneOfVoice(result.toneOfVoice);
    setTargetAudience(result.targetAudience);
    setGoals(result.goals);
    setVisualGuidelines(result.visualGuidelines);
    setPillars(result.pillars.map((pillar) => ({ name: pillar.name, description: pillar.description })));
  }

  async function runAnalysis() {
    if (name.trim().length < 2) {
      toast.error("Vul eerst de merknaam in.");
      return;
    }
    if (!websiteUrl.trim() && !stylebook) {
      toast.error("Voeg een website of stylboek toe.");
      return;
    }
    setAnalyzing(true);
    try {
      const form = new FormData();
      form.set("name", name);
      form.set("industry", industry);
      form.set("websiteUrl", websiteUrl);
      if (stylebook) {
        form.set("stylebook", stylebook);
      }
      const response = await fetch("/api/ai/analyze-brand", { method: "POST", body: form });
      const payload = (await response.json()) as { analysis?: BrandAnalysis; error?: string };
      if (!response.ok || !payload.analysis) {
        throw new Error(payload.error ?? "Analyse mislukt.");
      }
      applyAnalysis(payload.analysis);
      toast.success("Merkanalyse klaar. Controleer de velden en ga verder.");
      setStep(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analyse mislukt.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function submit() {
    setPending(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          websiteUrl,
          industry,
          toneOfVoice,
          targetAudience,
          goals,
          visualGuidelines,
          brandAnalysis: analysis ?? undefined,
          pillars: pillars.filter((pillar) => pillar.name.trim()),
        }),
      });
      const payload = (await response.json()) as { project?: { id: string; slug: string }; error?: string };
      if (!response.ok || !payload.project) {
        throw new Error(payload.error ?? "Aanmaken mislukt.");
      }
      if (stylebook) {
        const form = new FormData();
        form.set("projectId", payload.project.id);
        form.set("stylebook", stylebook);
        const upload = await fetch("/api/projects/stylebook", { method: "POST", body: form });
        if (!upload.ok) {
          const detail = (await upload.json()) as { error?: string };
          throw new Error(detail.error ?? "Stylboek uploaden mislukt.");
        }
      }
      toast.success("Project aangemaakt.");
      router.push(`/projects/${payload.project.slug}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aanmaken mislukt.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Stap {step + 1} van 3</p>
      {step === 0 ? (
        <div className="space-y-4">
          <Field label="Naam van het merk of project">
            <Input value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label="Website (optioneel)">
            <Input
              type="url"
              placeholder="https://"
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
            />
          </Field>
          <Field label="Branche">
            <Input value={industry} onChange={(event) => setIndustry(event.target.value)} />
          </Field>
          <Field label="Stylboek (PDF, PNG of JPG)">
            <Input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={(event) => setStylebook(event.target.files?.[0] ?? null)}
            />
            {stylebook ? <p className="text-sm text-muted-foreground">{stylebook.name}</p> : null}
          </Field>
          <p className="text-sm text-muted-foreground">
            Laat AI website en stylboek analyseren. Je kunt het resultaat daarna nog aanpassen.
          </p>
          <Button type="button" disabled={analyzing || name.trim().length < 2} onClick={() => void runAnalysis()}>
            {analyzing ? "Analyseren…" : "Merk analyseren"}
          </Button>
        </div>
      ) : null}
      {step === 1 ? (
        <div className="space-y-4">
          {analysis ? (
            <div className="rounded-xl bg-muted/60 p-4 text-sm">
              <p className="font-medium">Samenvatting</p>
              <p className="mt-1 text-muted-foreground">{analysis.summary}</p>
              <p className="mt-3 font-medium">Positionering</p>
              <p className="mt-1 text-muted-foreground">{analysis.positioning}</p>
            </div>
          ) : null}
          <Field label="Toon van de stem">
            <Textarea
              value={toneOfVoice}
              onChange={(event) => setToneOfVoice(event.target.value)}
              placeholder="Warm, direct, zonder jargon…"
            />
          </Field>
          <Field label="Doelgroep">
            <Textarea
              value={targetAudience}
              onChange={(event) => setTargetAudience(event.target.value)}
            />
          </Field>
          <Field label="Doelen">
            <Textarea value={goals} onChange={(event) => setGoals(event.target.value)} />
          </Field>
          <Field label="Visuele richtlijnen">
            <Textarea
              value={visualGuidelines}
              onChange={(event) => setVisualGuidelines(event.target.value)}
              placeholder="Kleuren, fotostijl, wat je juist niet wilt…"
            />
          </Field>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="space-y-4">
          {pillars.map((pillar, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-2">
              <Input
                value={pillar.name}
                onChange={(event) =>
                  setPillars((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, name: event.target.value } : item
                    )
                  )
                }
                placeholder="Pijler"
              />
              <Input
                value={pillar.description}
                onChange={(event) =>
                  setPillars((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, description: event.target.value } : item
                    )
                  )
                }
                placeholder="Korte toelichting"
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => setPillars((current) => [...current, { name: "", description: "" }])}
          >
            Pijler toevoegen
          </Button>
        </div>
      ) : null}
      <div className="flex justify-between">
        <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Terug
        </Button>
        {step < 2 ? (
          <Button type="button" disabled={step === 0 && name.trim().length < 2} onClick={() => setStep(step + 1)}>
            Volgende
          </Button>
        ) : (
          <Button type="button" disabled={pending} onClick={() => void submit()}>
            {pending ? "Aanmaken…" : "Project starten"}
          </Button>
        )}
      </div>
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
