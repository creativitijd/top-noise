import { asString } from "@/lib/publishers/types";
import type { AnalyticsResult, PublishInput, PublishResult, Publisher } from "@/lib/publishers/types";

const GRAPH = "https://graph.facebook.com/v21.0";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function graphError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: { message?: string } };
    return data.error?.message ?? `Instagram API ${response.status}`;
  } catch {
    return `Instagram API ${response.status}`;
  }
}

export const instagramPublisher: Publisher = {
  platform: "instagram",

  async publish(input: PublishInput): Promise<PublishResult> {
    const accountId = asString(input.meta.instagram_account_id) ?? asString(input.meta.account_id);
    if (!accountId) {
      return { success: false, error: "Geen Instagram-account gekoppeld. Verbind het kanaal opnieuw." };
    }
    if (input.imageUrls.length === 0) {
      return { success: false, error: "Instagram vereist minstens één afbeelding." };
    }

    const containerResponse = await fetch(`${GRAPH}/${accountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: input.imageUrls[0],
        caption: input.content,
        access_token: input.accessToken,
      }),
    });
    if (!containerResponse.ok) {
      return { success: false, error: await graphError(containerResponse) };
    }
    const container = (await containerResponse.json()) as { id?: string };
    if (!container.id) {
      return { success: false, error: "Instagram gaf geen container-id terug." };
    }

    await sleep(5000);

    const publishResponse = await fetch(`${GRAPH}/${accountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: input.accessToken,
      }),
    });
    if (!publishResponse.ok) {
      return { success: false, error: await graphError(publishResponse) };
    }
    const published = (await publishResponse.json()) as { id?: string };
    return { success: true, remoteId: published.id };
  },

  async fetchAnalytics(input): Promise<AnalyticsResult> {
    const response = await fetch(
      `${GRAPH}/${input.remoteId}?fields=like_count,comments_count,insights.metric(impressions,reach,saved)&access_token=${encodeURIComponent(input.accessToken)}`
    );
    if (!response.ok) {
      return { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0, raw: {} };
    }
    const data = (await response.json()) as {
      like_count?: number;
      comments_count?: number;
      insights?: { data?: Array<{ name?: string; values?: Array<{ value?: number }> }> };
    };
    const impressionMetric = data.insights?.data?.find((item) => item.name === "impressions");
    return {
      impressions: impressionMetric?.values?.[0]?.value ?? 0,
      likes: data.like_count ?? 0,
      comments: data.comments_count ?? 0,
      shares: 0,
      clicks: 0,
      raw: data as Record<string, unknown>,
    };
  },
};
