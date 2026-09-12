import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { appUrl, googleOAuthConfigured, requiredEnv } from "@/lib/env";
import type { DataSourceProvider } from "@/types/database";

export const GOOGLE_SCOPES: Record<DataSourceProvider, string> = {
  ga4: "https://www.googleapis.com/auth/analytics.readonly",
  gsc: "https://www.googleapis.com/auth/webmasters.readonly",
};

export type GoogleOAuthState = {
  projectId: string;
  userId: string;
  provider: DataSourceProvider;
  returnTo: string;
  nonce: string;
  exp: number;
};

function secret() {
  return requiredEnv("APP_SECRET");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function googleRedirectUri(): string {
  return process.env.GOOGLE_REDIRECT_URI ?? `${appUrl()}/api/oauth/google/callback`;
}

export function assertGoogleConfigured() {
  if (!googleOAuthConfigured()) {
    throw new Error("Google OAuth is niet geconfigureerd (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).");
  }
}

export function createGoogleOAuthState(input: {
  projectId: string;
  userId: string;
  provider: DataSourceProvider;
  returnTo: string;
}): string {
  const state: GoogleOAuthState = {
    ...input,
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + 10 * 60 * 1000,
  };
  const payload = Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseGoogleOAuthState(value: string): GoogleOAuthState {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    throw new Error("Ongeldige Google OAuth-state.");
  }
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("OAuth-state-handtekening ongeldig.");
  }
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GoogleOAuthState;
  if (parsed.exp < Date.now()) {
    throw new Error("OAuth-state is verlopen. Probeer opnieuw te verbinden.");
  }
  if (parsed.provider !== "ga4" && parsed.provider !== "gsc") {
    throw new Error("Onbekende databron in OAuth-state.");
  }
  return parsed;
}

export function safeReturnTo(value: string | null): string {
  if (!value) {
    return "/projects";
  }
  const path = value.startsWith("/") ? value : `/${value}`;
  if (!path.startsWith("/projects/") || path.startsWith("//") || path.includes("://")) {
    return "/projects";
  }
  return path.split("?")[0];
}

export function googleAuthorizeUrl(state: string, provider: DataSourceProvider): string {
  assertGoogleConfigured();
  const params = new URLSearchParams({
    client_id: requiredEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES[provider],
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export type GoogleTokens = {
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: string;
  scope: string | null;
};

export async function exchangeGoogleCode(code: string): Promise<GoogleTokens> {
  assertGoogleConfigured();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google token-uitwisseling mislukt (${response.status}): ${detail.slice(0, 240)}`);
  }
  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    tokenExpiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
    scope: data.scope ?? null,
  };
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokens> {
  assertGoogleConfigured();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google-token vernieuwen mislukt (${response.status}): ${detail.slice(0, 240)}`);
  }
  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    tokenExpiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
    scope: data.scope ?? null,
  };
}

export async function googleJson<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google API ${response.status}: ${detail.slice(0, 300)}`);
  }
  if (response.status === 204) {
    return {} as T;
  }
  return (await response.json()) as T;
}
