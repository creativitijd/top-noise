import type { AnalyticsResult, PublishInput, PublishResult, Publisher } from "@/lib/publishers/types";

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  return text.slice(0, 500);
}

export const linkedinPublisher: Publisher = {
  platform: "linkedin",

  async publish(input: PublishInput): Promise<PublishResult> {
    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    if (!profileResponse.ok) {
      return { success: false, error: `LinkedIn-profiel: ${await readError(profileResponse)}` };
    }
    const profile = (await profileResponse.json()) as { sub?: string };
    if (!profile.sub) {
      return { success: false, error: "LinkedIn gaf geen gebruikers-id terug." };
    }
    const personUrn = `urn:li:person:${profile.sub}`;

    const mediaAssets: Array<{
      status: string;
      description: { text: string };
      media: string;
      title: { text: string };
    }> = [];

    for (const imageUrl of input.imageUrls) {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        continue;
      }
      const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
      const imageBuffer = await imageResponse.arrayBuffer();

      const registerResponse = await fetch(
        "https://api.linkedin.com/v2/assets?action=registerUpload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${input.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
              owner: personUrn,
              serviceRelationships: [
                { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
              ],
            },
          }),
        }
      );
      if (!registerResponse.ok) {
        continue;
      }
      const registerData = (await registerResponse.json()) as {
        value?: {
          asset?: string;
          uploadMechanism?: Record<string, { uploadUrl?: string }>;
        };
      };
      const uploadUrl =
        registerData.value?.uploadMechanism?.[
          "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
        ]?.uploadUrl;
      const asset = registerData.value?.asset;
      if (!uploadUrl || !asset) {
        continue;
      }

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": contentType,
        },
        body: imageBuffer,
      });
      if (uploadResponse.ok) {
        mediaAssets.push({
          status: "READY",
          description: { text: "Image" },
          media: asset,
          title: { text: "Image" },
        });
      }
    }

    const postBody = {
      author: personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: input.content },
          shareMediaCategory: mediaAssets.length > 0 ? "IMAGE" : "NONE",
          ...(mediaAssets.length > 0 ? { media: mediaAssets } : {}),
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };

    const postResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });
    if (!postResponse.ok) {
      return { success: false, error: `LinkedIn post: ${await readError(postResponse)}` };
    }
    return { success: true, remoteId: postResponse.headers.get("x-restli-id") ?? undefined };
  },

  async fetchAnalytics(input): Promise<AnalyticsResult> {
    const encoded = encodeURIComponent(input.remoteId);
    const response = await fetch(
      `https://api.linkedin.com/v2/socialActions/${encoded}`,
      { headers: { Authorization: `Bearer ${input.accessToken}` } }
    );
    if (!response.ok) {
      return { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0, raw: {} };
    }
    const data = (await response.json()) as {
      likesSummary?: { totalLikes?: number };
      commentsSummary?: { totalFirstLevelComments?: number };
    };
    return {
      impressions: 0,
      likes: data.likesSummary?.totalLikes ?? 0,
      comments: data.commentsSummary?.totalFirstLevelComments ?? 0,
      shares: 0,
      clicks: 0,
      raw: data as Record<string, unknown>,
    };
  },
};
