export const PLATFORMS = ["linkedin", "facebook", "instagram", "wordpress"] as const;

export type Platform = (typeof PLATFORMS)[number];

export const FUTURE_PLATFORMS = ["x", "tiktok", "bluesky"] as const;

export type FuturePlatform = (typeof FUTURE_PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform | FuturePlatform, string> = {
  linkedin: "LinkedIn",
  facebook: "Facebook",
  instagram: "Instagram",
  wordpress: "WordPress",
  x: "X",
  tiktok: "TikTok",
  bluesky: "Bluesky",
};

export const PLATFORM_REQUIREMENTS: Record<Platform, string> = {
  linkedin: "Persoonlijk of bedrijf-account met w_member_social.",
  facebook: "Alleen Facebook Pages, geen persoonlijk profiel.",
  instagram: "Business- of Creator-account, gekoppeld aan een Facebook Page.",
  wordpress: "REST API + Application Password van een beheerder.",
};

export const POST_STATUSES = [
  "draft",
  "approved",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "rejected",
] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: "Concept",
  approved: "Goedgekeurd",
  scheduled: "Gepland",
  publishing: "Bezig",
  published: "Gepubliceerd",
  failed: "Mislukt",
  rejected: "Afgewezen",
};

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}
