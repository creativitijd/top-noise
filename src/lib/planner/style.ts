import type { Platform } from "@/lib/platforms";
import type { Media, Post, PostTarget } from "@/types/database";

export type CalendarPost = Post & {
  post_targets?: Pick<PostTarget, "platform" | "status">[];
  media?: Pick<Media, "public_url">[];
};

export const PLATFORM_CHIP: Record<
  Platform,
  { label: string; bg: string; fg: string; badge: string }
> = {
  facebook: { label: "f", bg: "bg-[#e6eef9]", fg: "text-[#3c5c85]", badge: "bg-[#3c5c85]" },
  instagram: { label: "ig", bg: "bg-[#faf0e6]", fg: "text-[#b8562c]", badge: "bg-[#b8562c]" },
  linkedin: { label: "in", bg: "bg-[#f1f6e7]", fg: "text-[#3f6b2b]", badge: "bg-[#3f6b2b]" },
  wordpress: { label: "wp", bg: "bg-[#eceafb]", fg: "text-[#5b4fa8]", badge: "bg-[#5b4fa8]" },
};

export const PLATFORM_CARD: Record<
  Platform,
  { card: string; timeBg: string; timeFg: string; monthBg: string; monthFg: string; dot: string }
> = {
  linkedin: {
    card: "bg-[#f1f6e7]",
    timeBg: "bg-[rgb(79_134_55_/_16%)]",
    timeFg: "text-[#3f6b2b]",
    monthBg: "bg-[#f1f6e7]",
    monthFg: "text-[#3f6b2b]",
    dot: "bg-[#4f8637]",
  },
  instagram: {
    card: "bg-[#fbf1e8]",
    timeBg: "bg-[rgb(184_86_44_/_14%)]",
    timeFg: "text-[#b8562c]",
    monthBg: "bg-[#fbf1e8]",
    monthFg: "text-[#a04c26]",
    dot: "bg-[#c2572c]",
  },
  facebook: {
    card: "bg-[#e6eef9]",
    timeBg: "bg-[rgb(60_92_133_/_14%)]",
    timeFg: "text-[#3c5c85]",
    monthBg: "bg-[#e6eef9]",
    monthFg: "text-[#34527a]",
    dot: "bg-[#3c5c85]",
  },
  wordpress: {
    card: "bg-[#eceafb]",
    timeBg: "bg-[rgb(91_79_168_/_14%)]",
    timeFg: "text-[#5b4fa8]",
    monthBg: "bg-[#eceafb]",
    monthFg: "text-[#4c4193]",
    dot: "bg-[#5b4fa8]",
  },
};

export function primaryPlatform(post: CalendarPost): Platform | null {
  return post.post_targets?.[0]?.platform ?? null;
}

export function matchesPlannerFilter(status: Post["status"], filter: string | null): boolean {
  if (!filter) {
    return true;
  }
  if (filter === "draft") {
    return status === "draft" || status === "rejected";
  }
  if (filter === "scheduled") {
    return status === "scheduled" || status === "publishing" || status === "approved";
  }
  if (filter === "published") {
    return status === "published";
  }
  return true;
}
