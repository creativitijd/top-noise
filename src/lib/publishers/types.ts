import type { Platform } from "@/lib/platforms";

export type PublishInput = {
  content: string;
  title?: string | null;
  imageUrls: string[];
  accessToken: string;
  refreshToken?: string | null;
  meta: Record<string, unknown>;
};

export type PublishResult = {
  success: boolean;
  remoteId?: string;
  error?: string;
};

export type AnalyticsResult = {
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  raw: Record<string, unknown>;
};

export type Publisher = {
  platform: Platform;
  publish(input: PublishInput): Promise<PublishResult>;
  fetchAnalytics(input: {
    remoteId: string;
    accessToken: string;
    meta: Record<string, unknown>;
  }): Promise<AnalyticsResult>;
};

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
