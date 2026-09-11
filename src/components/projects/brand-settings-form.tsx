"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

  async function save() {
    setPending(true);
    try {
      const response = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.id, ...form }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Opslaan mislukt.");
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
