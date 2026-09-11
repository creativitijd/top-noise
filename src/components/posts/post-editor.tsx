"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Check, ImageIcon, Info, Pencil, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { PlatformMark } from "@/components/posts/platform-mark";
import { PlatformPreview } from "@/components/posts/platform-preview";
import type { GeneratedContent } from "@/lib/ai/prompts";
import { formatPostPreviewWhen, formatPostWhen, formatSavedAgo } from "@/lib/dates";
import {
  PLATFORM_CHAR_LIMITS,
  PLATFORM_LABELS,
  PLATFORM_ORDER,
  POST_STATUS_LABELS,
  type Platform,
  type PostStatus,
} from "@/lib/platforms";
import { cn } from "@/lib/utils";
import type { Media, Post, PostTarget } from "@/types/database";

const TONES = ["warm", "zakelijk", "speels"] as const;
type Tone = (typeof TONES)[number];
type RewriteInstruction = "rewrite" | "shorter" | "question" | Tone;

const TONE_LABEL: Record<Tone, string> = {
  warm: "Warm",
  zakelijk: "Zakelijk",
  speels: "Speels",
};

const STATUS_PILL: Record<PostStatus, { wrap: string; dot: string }> = {
  draft: { wrap: "bg-[#f1f6e7] text-[#3f6b2b]", dot: "bg-[#4f8637]" },
  approved: { wrap: "bg-[#f1f6e7] text-[#3f6b2b]", dot: "bg-[#4f8637]" },
  scheduled: { wrap: "bg-[#e6eef9] text-[#3c5c85]", dot: "bg-[#3c5c85]" },
  publishing: { wrap: "bg-[#eeebe8] text-[#635a52]", dot: "bg-[#8b8079]" },
  published: { wrap: "bg-[#f1f6e7] text-[#3f6b2b]", dot: "bg-[#4f8637]" },
  failed: { wrap: "bg-[#fbf1e8] text-[#b8562c]", dot: "bg-[#c2572c]" },
  rejected: { wrap: "bg-[#fbf1e8] text-[#b8562c]", dot: "bg-[#c2572c]" },
};

function cleanTag(value: string): string {
  return value.replace(/^#+/, "").trim().toLowerCase().replace(/\s+/g, "");
}

function sortPlatforms(platforms: Platform[]): Platform[] {
  return [...platforms].sort((a, b) => PLATFORM_ORDER.indexOf(a) - PLATFORM_ORDER.indexOf(b));
}

export function PostEditor({
  projectId,
  projectName,
  projectSlug,
  brandColors,
  post,
  targets,
  media,
}: {
  projectId: string;
  projectName: string;
  projectSlug: string;
  brandColors: string[];
  post: Post;
  targets: PostTarget[];
  media: Media[];
}) {
  const router = useRouter();
  const platforms = useMemo(
    () => sortPlatforms(targets.map((target) => target.platform)),
    [targets]
  );
  const [topic, setTopic] = useState(post.topic);
  const [title, setTitle] = useState(post.title ?? "");
  const [explanation, setExplanation] = useState(post.explanation ?? "");
  const [visualBrief, setVisualBrief] = useState(post.visual_brief ?? "");
  const [editingBrief, setEditingBrief] = useState(false);
  const [imageUrl, setImageUrl] = useState(media[0]?.public_url ?? "");
  const [showImageUrl, setShowImageUrl] = useState(false);
  const [contents, setContents] = useState<Record<string, string>>(() =>
    Object.fromEntries(targets.map((target) => [target.platform, target.content]))
  );
  const [hashtags, setHashtags] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(targets.map((target) => [target.platform, target.hashtags ?? []]))
  );
  const [active, setActive] = useState<Platform>(platforms[0] ?? "linkedin");
  const [tone, setTone] = useState<Tone>("warm");
  const [previewAll, setPreviewAll] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState(post.updated_at);
  const [savedLabel, setSavedLabel] = useState(() => formatSavedAgo(post.updated_at));
  const [newTag, setNewTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  const text = contents[active] ?? "";
  const limit = PLATFORM_CHAR_LIMITS[active];
  const tags = hashtags[active] ?? [];
  const statusStyle = STATUS_PILL[post.status];
  const locked = post.status === "published" || post.status === "publishing";
  const busy = Boolean(pending);
  const previewPlatforms = previewAll ? platforms : platforms.filter((platform) => platform === active);
  const allLabel = platforms.length === 3 ? "Alle drie" : "Alle kanalen";

  useEffect(() => {
    const tick = () => setSavedLabel(formatSavedAgo(savedAt));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [savedAt]);

  function markDirty() {
    setDirty(true);
  }

  async function save() {
    const response = await fetch(`/api/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        title,
        explanation,
        visualBrief,
        imageUrl: imageUrl.trim() ? imageUrl.trim() : null,
        targets: platforms.map((platform) => ({
          platform,
          content: contents[platform] ?? "",
          hashtags: hashtags[platform] ?? [],
        })),
      }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Opslaan mislukt.");
    }
    setDirty(false);
    setSavedAt(new Date().toISOString());
  }

  async function run(label: string, action: () => Promise<void>, success?: string) {
    setPending(label);
    try {
      await action();
      if (success) {
        toast.success(success);
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Actie mislukt.");
    } finally {
      setPending(null);
    }
  }

  async function generateAll() {
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
    const payload = (await response.json()) as { error?: string; generated?: GeneratedContent };
    if (!response.ok || !payload.generated) {
      throw new Error(payload.error ?? "Genereren mislukt.");
    }
    const generated = payload.generated;
    setTitle(generated.title);
    setExplanation(generated.explanation);
    setVisualBrief(generated.visualBrief);
    setContents((current) => {
      const next = { ...current };
      for (const platform of platforms) {
        const value = generated.platforms[platform];
        if (value) {
          next[platform] = value;
        }
      }
      return next;
    });
    setHashtags((current) => {
      const next = { ...current };
      for (const platform of platforms) {
        next[platform] = generated.hashtags;
      }
      return next;
    });
    setDirty(false);
    setSavedAt(new Date().toISOString());
  }

  async function rewrite(instruction: RewriteInstruction) {
    if (!text.trim()) {
      await generateAll();
      return;
    }
    const response = await fetch("/api/ai/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        platform: active,
        content: text,
        instruction,
      }),
    });
    const payload = (await response.json()) as { error?: string; content?: string };
    if (!response.ok || !payload.content) {
      throw new Error(payload.error ?? "Herschrijven mislukt.");
    }
    setContents((current) => ({ ...current, [active]: payload.content ?? "" }));
    markDirty();
  }

  function addTag(raw: string) {
    const tag = cleanTag(raw);
    if (!tag) {
      return;
    }
    setHashtags((current) => {
      const existing = current[active] ?? [];
      if (existing.some((item) => cleanTag(item) === tag)) {
        return current;
      }
      return { ...current, [active]: [...existing, tag] };
    });
    setNewTag("");
    setAddingTag(false);
    markDirty();
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-3.5 rounded-[20px] border border-[rgb(31_27_24_/_8%)] bg-white px-[18px] py-3.5">
        <Link
          href={`/projects/${projectSlug}`}
          className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#635a52] hover:text-[#3f6b2b]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 6l-6 6 6 6" />
          </svg>
          Kalender
        </Link>
        <span className="h-5 w-px bg-[rgb(31_27_24_/_12%)]" />
        <input
          value={topic}
          onChange={(event) => {
            setTopic(event.target.value);
            markDirty();
          }}
          className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-heading)] text-[19px] font-semibold tracking-[-0.03em] outline-none md:flex-none"
        />
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", statusStyle.wrap)}>
          <span className={cn("size-1.5 rounded-full", statusStyle.dot)} />
          {POST_STATUS_LABELS[post.status]}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#8b8079]">
          <Calendar className="size-3.5" />
          {formatPostWhen(post.scheduled_at, post.timezone)}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] font-medium text-[#aaa09a]">{dirty ? "Niet opgeslagen" : savedLabel}</span>
          <button
            type="button"
            disabled={busy || locked}
            onClick={() =>
              void run("reject", async () => {
                const response = await fetch(`/api/posts/${post.id}/reject`, { method: "POST" });
                if (!response.ok) {
                  throw new Error("Afwijzen mislukt.");
                }
              }, "Afgewezen.")
            }
            className="rounded-full border border-[rgb(31_27_24_/_14%)] px-4 py-2 text-[13.5px] font-semibold text-[#635a52] hover:bg-[rgb(31_27_24_/_5%)] disabled:opacity-50"
          >
            Afwijzen
          </button>
          <button
            type="button"
            disabled={busy || locked}
            onClick={() =>
              void run("approve", async () => {
                await save();
                const response = await fetch(`/api/posts/${post.id}/approve`, { method: "POST" });
                const payload = (await response.json()) as { error?: string };
                if (!response.ok) {
                  throw new Error(payload.error ?? "Goedkeuren mislukt.");
                }
              }, "Goedgekeurd en gepland.")
            }
            className="inline-flex items-center gap-2 rounded-full bg-[#4f8637] px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#3f6b2b] disabled:opacity-50"
          >
            <Check className="size-3.5" />
            Goedkeuren en plannen
          </button>
        </div>
      </div>

      <div className="grid items-start gap-3.5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3.5">
          <section className="rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-[22px]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-[family-name:var(--font-heading)] text-[17px] font-semibold tracking-[-0.03em]">Kanalen</h2>
              <p className="text-[12.5px] text-[#8b8079]">Tekst wordt per kanaal apart geschreven</p>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {platforms.map((platform) => {
                const on = active === platform;
                const count = (contents[platform] ?? "").length;
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => setActive(platform)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-2xl border-2 px-4 py-3 text-left",
                      on
                        ? "border-[#1f1b18] bg-white shadow-[0_10px_24px_-14px_rgba(31,27,24,.8)]"
                        : "border-[rgb(31_27_24_/_10%)] bg-[#fafaf9]"
                    )}
                  >
                    <PlatformMark platform={platform} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{PLATFORM_LABELS[platform]}</span>
                      <span className={cn("block text-[11.5px] font-semibold", on ? "text-[#4f8637]" : "text-[#aaa09a]")}>
                        {count} / {PLATFORM_CHAR_LIMITS[platform]}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "ml-auto flex size-5 shrink-0 items-center justify-center rounded-full text-white",
                        on ? "bg-[#4f8637]" : "bg-[#d8d4d0]"
                      )}
                    >
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white">
            <div className="flex flex-wrap items-center gap-2.5 px-[22px] pt-[18px] pb-3.5">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[#f1f6e7] text-[#4f8637]">
                <Pencil className="size-[15px]" />
              </span>
              <h2 className="font-[family-name:var(--font-heading)] text-[17px] font-semibold tracking-[-0.03em]">
                Tekst voor {PLATFORM_LABELS[active]}
              </h2>
              <span className="ml-auto flex items-center gap-2">
                <span className="text-xs font-semibold text-[#8b8079]">
                  {text.length} / {limit} tekens
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run("rewrite", () => rewrite(tone), "Herschreven.")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(31_27_24_/_14%)] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#635a52] hover:bg-[rgb(31_27_24_/_5%)] disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-3.5", pending === "rewrite" && "animate-spin")} />
                  Herschrijf
                </button>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 px-[22px] pb-3.5">
              <span className="self-center text-xs font-semibold text-[#aaa09a]">Toon</span>
              {TONES.map((value) => {
                const on = tone === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTone(value)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold",
                      on ? "border-[#1f1b18] bg-[#1f1b18] text-white" : "border-[rgb(31_27_24_/_14%)] text-[#635a52]"
                    )}
                  >
                    {TONE_LABEL[value]}
                  </button>
                );
              })}
              <span className="mx-1 h-5 w-px self-center bg-[rgb(31_27_24_/_10%)]" />
              <button
                type="button"
                disabled={busy}
                onClick={() => void run("shorter", () => rewrite("shorter"), "Ingekort.")}
                className="rounded-full border border-[rgb(31_27_24_/_14%)] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#635a52] hover:bg-[rgb(31_27_24_/_5%)] disabled:opacity-50"
              >
                Korter
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run("question", () => rewrite("question"), "Vraag toegevoegd.")}
                className="rounded-full border border-[rgb(31_27_24_/_14%)] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#635a52] hover:bg-[rgb(31_27_24_/_5%)] disabled:opacity-50"
              >
                Meer vraag
              </button>
            </div>
            <div className="px-[22px] pb-[22px]">
              <textarea
                value={text}
                onChange={(event) => {
                  setContents((current) => ({ ...current, [active]: event.target.value }));
                  markDirty();
                }}
                className="min-h-[210px] w-full resize-y rounded-2xl border border-[rgb(31_27_24_/_14%)] bg-[#fafaf9] px-4 py-4 text-[15px] leading-[1.6] text-[#1f1b18] outline-none focus:outline-2 focus:outline-offset-1 focus:outline-[#4f8637]"
              />
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setHashtags((current) => ({
                        ...current,
                        [active]: (current[active] ?? []).filter((item) => item !== tag),
                      }));
                      markDirty();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f6e7] px-2.5 py-1 text-[11.5px] font-semibold text-[#3f6b2b]"
                    title="Verwijderen"
                  >
                    #{cleanTag(tag)}
                  </button>
                ))}
                {addingTag ? (
                  <input
                    autoFocus
                    value={newTag}
                    onChange={(event) => setNewTag(event.target.value)}
                    onBlur={() => {
                      if (newTag.trim()) {
                        addTag(newTag);
                      } else {
                        setAddingTag(false);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addTag(newTag);
                      }
                      if (event.key === "Escape") {
                        setAddingTag(false);
                        setNewTag("");
                      }
                    }}
                    placeholder="tag"
                    className="w-28 rounded-full border border-[#4f8637] px-2.5 py-1 text-[11.5px] font-semibold outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingTag(true)}
                    className="rounded-full border border-dashed border-[rgb(31_27_24_/_20%)] px-2.5 py-1 text-[11.5px] font-semibold text-[#8b8079] hover:border-[#4f8637] hover:text-[#4f8637]"
                  >
                    + hashtag
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-[22px]">
            <div className="mb-4 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[#fbf1e8] text-[#b8562c]">
                <ImageIcon className="size-[15px]" />
              </span>
              <h2 className="font-[family-name:var(--font-heading)] text-[17px] font-semibold tracking-[-0.03em]">Beeld</h2>
              <span className="rounded-full bg-[#fbf1e8] px-2.5 py-1 text-[11.5px] font-semibold text-[#b8562c]">
                Eigen beeld
              </span>
              <span className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowImageUrl((current) => !current)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(31_27_24_/_14%)] px-3.5 py-2 text-[12.5px] font-semibold text-[#635a52] hover:bg-[rgb(31_27_24_/_5%)]"
                >
                  <Upload className="size-3.5" />
                  Eigen beeld
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run("generate", generateAll, "Opnieuw gegenereerd.")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#c2572c] px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-[#a9481f] disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-3.5", pending === "generate" && "animate-spin")} />
                  Genereer opnieuw
                </button>
              </span>
            </div>

            <div className="mb-4 rounded-2xl border border-[#f0dfd0] bg-[#fdf8f3] px-4 py-4">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="text-xs font-semibold tracking-[0.08em] text-[#b8562c] uppercase">Visuele brief</span>
                <button
                  type="button"
                  onClick={() => setEditingBrief((current) => !current)}
                  className="ml-auto text-xs font-semibold text-[#b8562c]"
                >
                  {editingBrief ? "Klaar" : "Bewerken"}
                </button>
              </div>
              {editingBrief ? (
                <textarea
                  value={visualBrief}
                  onChange={(event) => {
                    setVisualBrief(event.target.value);
                    markDirty();
                  }}
                  className="mb-3 min-h-20 w-full rounded-xl border border-[#f0dfd0] bg-white px-3 py-2 text-sm leading-[1.55] text-[#6b503f] outline-none focus:outline-2 focus:outline-[#c2572c]"
                />
              ) : (
                <p className="mb-3 text-sm leading-[1.55] text-[#6b503f]">
                  {visualBrief || "Nog geen visuele brief. Genereer de post of schrijf er zelf een."}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#6b503f]">Vierkant 1:1</span>
                {brandColors.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold text-[#6b503f]">
                    {brandColors.slice(0, 3).map((color) => (
                      <span
                        key={color}
                        className="size-2.5 rounded-[3px] border border-[rgb(31_27_24_/_15%)]"
                        style={{ background: color }}
                      />
                    ))}
                    Merkkleuren
                  </span>
                ) : null}
              </div>
            </div>

            {showImageUrl ? (
              <input
                type="url"
                placeholder="https://… beeld-URL"
                value={imageUrl}
                onChange={(event) => {
                  setImageUrl(event.target.value);
                  markDirty();
                }}
                className="mb-3 w-full rounded-2xl border border-[rgb(31_27_24_/_14%)] bg-[#fafaf9] px-4 py-3 text-sm outline-none focus:outline-2 focus:outline-offset-1 focus:outline-[#4f8637]"
              />
            ) : null}

            <div className="overflow-hidden rounded-2xl border-[3px] border-[#4f8637] bg-[#f5f5f4]">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-[2.4/1] flex-col items-center justify-center gap-1 bg-linear-to-br from-[#fff1c2] via-[#ffd97a] to-[#f2b53c] text-center">
                  <p className="text-sm font-semibold text-[#6b503f]">Nog geen beeld</p>
                  <p className="text-[12.5px] text-[#8b8079]">Plak een URL via Eigen beeld. AI-beeld volgt later.</p>
                </div>
              )}
            </div>
            <p className="mt-3 text-[12.5px] text-[#8b8079]">Gekozen beeld wordt op alle kanalen gebruikt.</p>
          </section>

          <section className="rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-[22px]">
            <div className="mb-3.5 flex items-center gap-2.5">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[#eceafb] text-[#5b4fa8]">
                <Info className="size-[15px]" />
              </span>
              <h2 className="font-[family-name:var(--font-heading)] text-[17px] font-semibold tracking-[-0.03em]">
                Waarom dit past
              </h2>
            </div>
            <textarea
              value={explanation}
              onChange={(event) => {
                setExplanation(event.target.value);
                markDirty();
              }}
              className="min-h-24 w-full resize-y rounded-2xl border border-transparent bg-transparent text-[14.5px] leading-[1.6] text-[#635a52] outline-none focus:border-[rgb(31_27_24_/_14%)] focus:bg-[#fafaf9] focus:px-3 focus:py-2"
            />
          </section>
        </div>

        <aside className="sticky top-[22px] flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <span className="font-[family-name:var(--font-heading)] text-[15px] font-semibold tracking-[-0.02em] text-[#635a52]">
              Voorbeeld
            </span>
            <span className="ml-auto flex rounded-full bg-[rgb(31_27_24_/_6%)] p-0.5">
              <button
                type="button"
                onClick={() => setPreviewAll(false)}
                className={cn(
                  "rounded-full px-3.5 py-1 text-[12.5px] font-semibold",
                  previewAll ? "text-[#635a52]" : "bg-[#1f1b18] text-white"
                )}
              >
                Dit kanaal
              </button>
              <button
                type="button"
                onClick={() => setPreviewAll(true)}
                className={cn(
                  "rounded-full px-3.5 py-1 text-[12.5px] font-semibold",
                  previewAll ? "bg-[#1f1b18] text-white" : "text-[#635a52]"
                )}
              >
                {allLabel}
              </button>
            </span>
          </div>

          {previewPlatforms.map((platform) => (
            <PlatformPreview
              key={platform}
              platform={platform}
              content={contents[platform] ?? ""}
              title={title}
              projectName={projectName}
              projectSlug={projectSlug}
              scheduledLabel={formatPostPreviewWhen(post.scheduled_at, post.timezone)}
              imageUrl={imageUrl}
              hashtags={hashtags[platform] ?? []}
            />
          ))}

          <div className="flex flex-wrap gap-2 pt-0.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run("save", save, "Opgeslagen.")}
              className="min-w-[130px] flex-1 rounded-full border border-[rgb(31_27_24_/_14%)] bg-white px-4 py-2.5 text-[13.5px] font-semibold text-[#635a52] hover:bg-[#fafaf9] disabled:opacity-50"
            >
              Opslaan als concept
            </button>
            <button
              type="button"
              disabled={busy || locked}
              onClick={() =>
                void run("now", async () => {
                  await save();
                  const response = await fetch(`/api/posts/${post.id}/approve?now=1`, { method: "POST" });
                  const payload = (await response.json()) as { error?: string };
                  if (!response.ok) {
                    throw new Error(payload.error ?? "Publiceren mislukt.");
                  }
                }, "Publicatie gestart.")
              }
              className="min-w-[130px] flex-1 rounded-full bg-[#1f1b18] px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-black disabled:opacity-50"
            >
              Nu publiceren
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
