"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/platforms";

export function CreatePostDialog({
  projectId,
  projectSlug,
  date,
  onClose,
}: {
  projectId: string;
  projectSlug: string;
  date: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["linkedin", "instagram"]);
  const [pending, setPending] = useState(false);

  function toggle(platform: string, checked: boolean) {
    setPlatforms((current) =>
      checked ? [...current, platform] : current.filter((item) => item !== platform)
    );
  }

  async function create(generate: boolean) {
    if (!date) {
      return;
    }
    setPending(true);
    try {
      const created = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, topic, date, platforms }),
      });
      const payload = (await created.json()) as { post?: { id: string }; error?: string };
      if (!created.ok || !payload.post) {
        throw new Error(payload.error ?? "Aanmaken mislukt.");
      }
      if (generate) {
        const generated = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            postId: payload.post.id,
            topic,
            platforms,
            date,
          }),
        });
        const generatedPayload = (await generated.json()) as { error?: string };
        if (!generated.ok) {
          throw new Error(generatedPayload.error ?? "Genereren mislukt.");
        }
      }
      router.push(`/projects/${projectSlug}/posts/${payload.post.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aanmaken mislukt.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={Boolean(date)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nieuw bericht</DialogTitle>
          <DialogDescription>
            {date ? `Gepland op ${date}. Kies daarna of je zelf schrijft of AI laat beginnen.` : null}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Onderwerp</Label>
            <Input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Platformen</Label>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map((platform) => (
                <label key={platform} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={platforms.includes(platform)}
                    onCheckedChange={(checked) => toggle(platform, checked === true)}
                  />
                  {PLATFORM_LABELS[platform]}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={pending || topic.trim().length < 2} onClick={() => void create(false)}>
            Alleen concept
          </Button>
          <Button disabled={pending || topic.trim().length < 2} onClick={() => void create(true)}>
            {pending ? "Bezig…" : "AI genereren"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
