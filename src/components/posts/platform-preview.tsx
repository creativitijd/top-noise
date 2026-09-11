"use client";

import { PLATFORM_LABELS, type Platform } from "@/lib/platforms";

export function PlatformPreview({
  platform,
  content,
  title,
}: {
  platform: Platform;
  content: string;
  title?: string | null;
}) {
  if (platform === "wordpress") {
    return (
      <article className="rounded-xl bg-background p-4 ring-1 ring-foreground/10">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Artikel</p>
        <h3 className="mt-1 text-xl">{title || "Zonder titel"}</h3>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-6">{content || "Nog geen tekst."}</div>
      </article>
    );
  }

  return (
    <article className="rounded-xl bg-background p-4 ring-1 ring-foreground/10">
      <div className="mb-3 flex items-center gap-2">
        <div className="size-8 rounded-full bg-primary/15" />
        <div>
          <p className="text-sm font-medium">{PLATFORM_LABELS[platform]}</p>
          <p className="text-xs text-muted-foreground">Voorbeeldweergave</p>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6">{content || "Nog geen tekst."}</p>
    </article>
  );
}
