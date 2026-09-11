import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { requiredEnv } from "@/lib/env";
import { isPlatform, type Platform } from "@/lib/platforms";

export type OAuthState = {
  projectId: string;
  platform: Platform;
  userId: string;
  nonce: string;
  exp: number;
};

function secret() {
  return requiredEnv("APP_SECRET");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createOAuthState(input: Omit<OAuthState, "nonce" | "exp">): string {
  const state: OAuthState = {
    ...input,
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + 10 * 60 * 1000,
  };
  const payload = Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseOAuthState(value: string): OAuthState {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    throw new Error("Ongeldige OAuth-state.");
  }
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("OAuth-state-handtekening ongeldig.");
  }
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthState;
  if (parsed.exp < Date.now()) {
    throw new Error("OAuth-state is verlopen. Probeer opnieuw te verbinden.");
  }
  if (!isPlatform(parsed.platform)) {
    throw new Error("Onbekend platform in OAuth-state.");
  }
  return parsed;
}
