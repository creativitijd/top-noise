import { appUrl, requiredEnv } from "@/lib/env";
import type { Platform } from "@/lib/platforms";

const GRAPH = "https://graph.facebook.com/v21.0";

export type ChannelCredentials = {
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: string | null;
  accountLabel?: string;
  externalId?: string;
  meta: Record<string, unknown>;
};

function redirectUri(platform: Platform): string {
  if (platform === "linkedin") {
    return process.env.LINKEDIN_REDIRECT_URI ?? `${appUrl()}/api/oauth/callback`;
  }
  if (platform === "instagram") {
    return process.env.INSTAGRAM_REDIRECT_URI ?? `${appUrl()}/api/oauth/callback`;
  }
  return process.env.FACEBOOK_REDIRECT_URI ?? `${appUrl()}/api/oauth/callback`;
}

export function getAuthorizeUrl(platform: Exclude<Platform, "wordpress">, state: string): string {
  if (platform === "linkedin") {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: requiredEnv("LINKEDIN_CLIENT_ID"),
      redirect_uri: redirectUri("linkedin"),
      state,
      scope: "openid profile w_member_social",
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  const isInstagram = platform === "instagram";
  const params = new URLSearchParams({
    client_id: requiredEnv(isInstagram ? "INSTAGRAM_APP_ID" : "FACEBOOK_APP_ID"),
    redirect_uri: redirectUri(platform),
    state,
    response_type: "code",
    scope: isInstagram
      ? "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management"
      : "pages_show_list,pages_read_engagement,pages_manage_posts,business_management",
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeOAuthCode(
  platform: Exclude<Platform, "wordpress">,
  code: string
): Promise<ChannelCredentials> {
  if (platform === "linkedin") {
    return exchangeLinkedIn(code);
  }
  return exchangeMeta(platform, code);
}

async function exchangeLinkedIn(code: string): Promise<ChannelCredentials> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri("linkedin"),
    client_id: requiredEnv("LINKEDIN_CLIENT_ID"),
    client_secret: requiredEnv("LINKEDIN_CLIENT_SECRET"),
  });
  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error(`LinkedIn token-uitwisseling mislukt (${response.status}).`);
  }
  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
  };
  const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const profile = profileResponse.ok
    ? ((await profileResponse.json()) as { name?: string; sub?: string })
    : {};

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    tokenExpiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : null,
    accountLabel: profile.name,
    externalId: profile.sub,
    meta: { sub: profile.sub ?? null },
  };
}

async function exchangeMeta(
  platform: "facebook" | "instagram",
  code: string
): Promise<ChannelCredentials> {
  const isInstagram = platform === "instagram";
  const clientId = requiredEnv(isInstagram ? "INSTAGRAM_APP_ID" : "FACEBOOK_APP_ID");
  const clientSecret = requiredEnv(isInstagram ? "INSTAGRAM_APP_SECRET" : "FACEBOOK_APP_SECRET");
  const tokenUrl = new URL(`${GRAPH}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri(platform));
  tokenUrl.searchParams.set("code", code);

  const shortResponse = await fetch(tokenUrl);
  if (!shortResponse.ok) {
    throw new Error(`Meta token-uitwisseling mislukt (${shortResponse.status}).`);
  }
  const short = (await shortResponse.json()) as { access_token: string };

  const longUrl = new URL(`${GRAPH}/oauth/access_token`);
  longUrl.searchParams.set("grant_type", "fb_exchange_token");
  longUrl.searchParams.set("client_id", clientId);
  longUrl.searchParams.set("client_secret", clientSecret);
  longUrl.searchParams.set("fb_exchange_token", short.access_token);
  const longResponse = await fetch(longUrl);
  const longToken = longResponse.ok
    ? ((await longResponse.json()) as { access_token: string; expires_in?: number })
    : { access_token: short.access_token, expires_in: undefined };

  const pagesResponse = await fetch(
    `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(longToken.access_token)}`
  );
  if (!pagesResponse.ok) {
    throw new Error("Facebook Pages ophalen mislukt. Controleer de app-rechten.");
  }
  const pages = (await pagesResponse.json()) as {
    data?: Array<{
      id: string;
      name: string;
      access_token: string;
      instagram_business_account?: { id: string };
    }>;
  };
  const page = pages.data?.[0];
  if (!page) {
    throw new Error("Geen Facebook Page gevonden voor dit account.");
  }

  if (platform === "instagram") {
    if (!page.instagram_business_account?.id) {
      throw new Error("Deze Page heeft geen gekoppeld Instagram Business-account.");
    }
    return {
      accessToken: page.access_token,
      tokenExpiresAt: longToken.expires_in
        ? new Date(Date.now() + longToken.expires_in * 1000).toISOString()
        : null,
      accountLabel: page.name,
      externalId: page.instagram_business_account.id,
      meta: {
        page_id: page.id,
        page_name: page.name,
        page_access_token: page.access_token,
        instagram_account_id: page.instagram_business_account.id,
        pages: pages.data ?? [],
      },
    };
  }

  return {
    accessToken: page.access_token,
    tokenExpiresAt: longToken.expires_in
      ? new Date(Date.now() + longToken.expires_in * 1000).toISOString()
      : null,
    accountLabel: page.name,
    externalId: page.id,
    meta: {
      page_id: page.id,
      page_name: page.name,
      page_access_token: page.access_token,
      instagram_account_id: page.instagram_business_account?.id ?? null,
      pages: pages.data ?? [],
    },
  };
}
