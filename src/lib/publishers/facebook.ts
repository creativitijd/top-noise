import { asString } from "@/lib/publishers/types";
import type { AnalyticsResult, PublishInput, PublishResult, Publisher } from "@/lib/publishers/types";

const GRAPH = "https://graph.facebook.com/v21.0";

async function graphError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: { message?: string } };
    return data.error?.message ?? `Facebook API ${response.status}`;
  } catch {
    return `Facebook API ${response.status}`;
  }
}

export const facebookPublisher: Publisher = {
  platform: "facebook",

  async publish(input: PublishInput): Promise<PublishResult> {
    const pageId = asString(input.meta.page_id);
    const pageToken = asString(input.meta.page_access_token) ?? input.accessToken;
    if (!pageId) {
      return { success: false, error: "Geen Facebook Page gekoppeld. Verbind het kanaal opnieuw." };
    }

    const endpoint =
      input.imageUrls.length > 0 ? `${GRAPH}/${pageId}/photos` : `${GRAPH}/${pageId}/feed`;
    const body =
      input.imageUrls.length > 0
        ? { url: input.imageUrls[0], caption: input.content, access_token: pageToken }
        : { message: input.content, access_token: pageToken };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { success: false, error: await graphError(response) };
    }
    const data = (await response.json()) as { id?: string; post_id?: string };
    return { success: true, remoteId: data.id ?? data.post_id };
  },

  async fetchAnalytics(input): Promise<AnalyticsResult> {
    const pageToken = asString(input.meta.page_access_token) ?? input.accessToken;
    const response = await fetch(
      `${GRAPH}/${input.remoteId}?fields=shares,likes.summary(true),comments.summary(true),insights.metric(post_impressions)&access_token=${encodeURIComponent(pageToken)}`
    );
    if (!response.ok) {
      return { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0, raw: {} };
    }
    const data = (await response.json()) as {
      shares?: { count?: number };
      likes?: { summary?: { total_count?: number } };
      comments?: { summary?: { total_count?: number } };
      insights?: { data?: Array<{ values?: Array<{ value?: number }> }> };
    };
    return {
      impressions: data.insights?.data?.[0]?.values?.[0]?.value ?? 0,
      likes: data.likes?.summary?.total_count ?? 0,
      comments: data.comments?.summary?.total_count ?? 0,
      shares: data.shares?.count ?? 0,
      clicks: 0,
      raw: data as Record<string, unknown>,
    };
  },
};
