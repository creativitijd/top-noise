import { asString } from "@/lib/publishers/types";
import type { AnalyticsResult, PublishInput, PublishResult, Publisher } from "@/lib/publishers/types";

function siteBase(url: string): string {
  return url.replace(/\/$/, "");
}

function toHtml(content: string): string {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

export async function testWordPressConnection(input: {
  siteUrl: string;
  username: string;
  appPassword: string;
}): Promise<{ ok: boolean; label?: string; error?: string }> {
  const auth = Buffer.from(`${input.username}:${input.appPassword}`).toString("base64");
  const response = await fetch(`${siteBase(input.siteUrl)}/wp-json/wp/v2/users/me`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!response.ok) {
    return { ok: false, error: `WordPress weigerde de verbinding (${response.status}).` };
  }
  const data = (await response.json()) as { name?: string; slug?: string };
  return { ok: true, label: data.name ?? data.slug ?? input.username };
}

export const wordpressPublisher: Publisher = {
  platform: "wordpress",

  async publish(input: PublishInput): Promise<PublishResult> {
    const siteUrl = asString(input.meta.site_url);
    const username = asString(input.meta.username);
    const appPassword = asString(input.meta.app_password) ?? input.accessToken;
    if (!siteUrl || !username || !appPassword) {
      return { success: false, error: "WordPress-gegevens onvolledig. Verbind de site opnieuw." };
    }

    const auth = Buffer.from(`${username}:${appPassword}`).toString("base64");
    let featuredMediaId: number | undefined;

    if (input.imageUrls[0]) {
      try {
        const imageResponse = await fetch(input.imageUrls[0]);
        if (imageResponse.ok) {
          const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
          const ext = contentType.includes("png") ? "png" : "jpg";
          const mediaResponse = await fetch(`${siteBase(siteUrl)}/wp-json/wp/v2/media`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": contentType,
              "Content-Disposition": `attachment; filename="promo-${Date.now()}.${ext}"`,
            },
            body: await imageResponse.arrayBuffer(),
          });
          if (mediaResponse.ok) {
            const media = (await mediaResponse.json()) as { id?: number };
            featuredMediaId = media.id;
          }
        }
      } catch {
        // Featured image is optional; continue publishing the post.
      }
    }

    const response = await fetch(`${siteBase(siteUrl)}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: input.title || "Nieuw bericht",
        content: toHtml(input.content),
        status: "publish",
        ...(featuredMediaId ? { featured_media: featuredMediaId } : {}),
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      return { success: false, error: detail.slice(0, 400) };
    }
    const data = (await response.json()) as { id?: number };
    return { success: true, remoteId: data.id ? String(data.id) : undefined };
  },

  async fetchAnalytics(): Promise<AnalyticsResult> {
    return { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0, raw: {} };
  },
};
