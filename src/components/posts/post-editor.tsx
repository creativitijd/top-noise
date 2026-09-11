"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PlatformPreview } from "@/components/posts/platform-preview";
import { POST_STATUS_LABELS, PLATFORM_LABELS, type Platform } from "@/lib/platforms";
import { formatDateTime } from "@/lib/dates";
import type { Media, Post, PostTarget } from "@/types/database";

export function PostEditor({
  projectId,
  post,
  targets,
  media,
}: {
  projectId: string;
  post: Post;
  targets: PostTarget[];
  media: Media[];
}) {
  const router = useRouter();
  const [topic, setTopic] = useState(post.topic);
  const [title, setTitle] = useState(post.title ?? "");
  const [explanation, setExplanation] = useState(post.explanation ?? "");
  const [visualBrief, setVisualBrief] = useState(post.visual_brief ?? "");
  const [imageUrl, setImageUrl] = useState(media[0]?.public_url ?? "");
  const [contents, setContents] = useState<Record<string, string>>(
    Object.fromEntries(targets.map((target) => [target.platform, target.content]))
  );
  const [pending, setPending] = useState<string | null>(null);
  const platforms = targets.map((target) => target.platform);
  const activePlatform = platforms[0] ?? "linkedin";

  async function save() {
    const response = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        title,
        explanation,
        visualBrief,
        imageUrl: imageUrl || null,
        targets: platforms.map((platform) => ({
          platform,
          content: contents[platform] ?? "",
        })),
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Opslaan mislukt.");
    }
  }

  async function run(label: string, action: () => Promise<void>) {
    setPending(label);
    try {
      await action();
      toast.success("Bijgewerkt.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Actie mislukt.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="secondary">{POST_STATUS_LABELS[post.status]}</Badge>
          <p className="text-sm text-muted-foreground">{formatDateTime(post.scheduled_at, post.timezone)}</p>
        </div>
        <div className="space-y-2">
          <Label>Onderwerp</Label>
          <Input value={topic} onChange={(event) => setTopic(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Interne titel</Label>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <Tabs defaultValue={activePlatform}>
          <TabsList>
            {platforms.map((platform) => (
              <TabsTrigger key={platform} value={platform}>
                {PLATFORM_LABELS[platform]}
              </TabsTrigger>
            ))}
          </TabsList>
          {platforms.map((platform) => (
            <TabsContent key={platform} value={platform} className="space-y-2 pt-3">
              <Label>Tekst voor {PLATFORM_LABELS[platform]}</Label>
              <Textarea
                className="min-h-48"
                value={contents[platform] ?? ""}
                onChange={(event) =>
                  setContents((current) => ({ ...current, [platform]: event.target.value }))
                }
              />
            </TabsContent>
          ))}
        </Tabs>
        <div className="space-y-2">
          <Label>Afbeeldings-URL (optioneel)</Label>
          <Input
            type="url"
            placeholder="https://"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Waarom dit past</Label>
          <Textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Visuele brief</Label>
          <Textarea value={visualBrief} onChange={(event) => setVisualBrief(event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={Boolean(pending)} onClick={() => void run("save", save)}>
            Opslaan
          </Button>
          <Button
            variant="secondary"
            disabled={Boolean(pending)}
            onClick={() =>
              void run("generate", async () => {
                await save();
                const response = await fetch("/api/ai/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    projectId,
                    postId: post.id,
                    topic,
                    platforms,
                  }),
                });
                const payload = (await response.json()) as { error?: string };
                if (!response.ok) {
                  throw new Error(payload.error ?? "Genereren mislukt.");
                }
              })
            }
          >
            Opnieuw genereren
          </Button>
          <Button
            variant="ghost"
            disabled={Boolean(pending)}
            onClick={() =>
              void run("reject", async () => {
                const response = await fetch(`/api/posts/${post.id}/reject`, { method: "POST" });
                if (!response.ok) {
                  throw new Error("Afwijzen mislukt.");
                }
              })
            }
          >
            Afwijzen
          </Button>
          <Button
            disabled={Boolean(pending)}
            onClick={() =>
              void run("approve", async () => {
                await save();
                const response = await fetch(`/api/posts/${post.id}/approve`, { method: "POST" });
                const payload = (await response.json()) as { error?: string };
                if (!response.ok) {
                  throw new Error(payload.error ?? "Goedkeuren mislukt.");
                }
              })
            }
          >
            Goedkeuren en plannen
          </Button>
          <Button
            variant="outline"
            disabled={Boolean(pending)}
            onClick={() =>
              void run("now", async () => {
                await save();
                const response = await fetch(`/api/posts/${post.id}/approve?now=1`, { method: "POST" });
                const payload = (await response.json()) as { error?: string };
                if (!response.ok) {
                  throw new Error(payload.error ?? "Publiceren mislukt.");
                }
              })
            }
          >
            Nu publiceren
          </Button>
        </div>
      </section>
      <aside className="space-y-4">
        {platforms.map((platform) => (
          <PlatformPreview
            key={platform}
            platform={platform as Platform}
            content={contents[platform] ?? ""}
            title={title}
          />
        ))}
      </aside>
    </div>
  );
}
