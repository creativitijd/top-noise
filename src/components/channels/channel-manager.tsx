"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FUTURE_PLATFORMS,
  PLATFORM_LABELS,
  PLATFORM_REQUIREMENTS,
  PLATFORMS,
  type Platform,
} from "@/lib/platforms";
import type { ChannelPublic } from "@/types/database";

export function ChannelManager({
  projectId,
  channels,
}: {
  projectId: string;
  channels: ChannelPublic[];
}) {
  const router = useRouter();
  const [siteUrl, setSiteUrl] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  function channelFor(platform: Platform) {
    return channels.find((channel) => channel.platform === platform);
  }

  async function disconnect(platform: Platform) {
    setPending(platform);
    try {
      const response = await fetch("/api/channels/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, platform }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Ontkoppelen mislukt.");
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ontkoppelen mislukt.");
    } finally {
      setPending(null);
    }
  }

  async function connectWordPress() {
    setPending("wordpress");
    try {
      const response = await fetch("/api/channels/wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          siteUrl,
          username,
          appPassword,
          connect: true,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Verbinding mislukt.");
      }
      toast.success("WordPress verbonden.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verbinding mislukt.");
    } finally {
      setPending(null);
    }
  }

  async function registerInterest(platform: string) {
    const response = await fetch("/api/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
    if (response.ok) {
      toast.success("Interesse opgeslagen. We bouwen dit kanaal later.");
    }
  }

  return (
    <div className="space-y-4">
      {PLATFORMS.map((platform) => {
        const channel = channelFor(platform);
        const connected = channel?.status === "connected";
        return (
          <section key={platform} className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl">{PLATFORM_LABELS[platform]}</h2>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  {PLATFORM_REQUIREMENTS[platform]}
                </p>
                <p className="mt-2 text-sm">
                  {connected
                    ? `Verbonden als ${channel.account_label ?? "account"}`
                    : "Nog niet verbonden"}
                </p>
              </div>
              {platform === "wordpress" ? null : connected ? (
                <Button
                  variant="outline"
                  disabled={pending === platform}
                  onClick={() => void disconnect(platform)}
                >
                  Ontkoppelen
                </Button>
              ) : (
                <a
                  href={`/api/oauth/${platform}?projectId=${projectId}`}
                  className={buttonVariants()}
                >
                  Verbinden
                </a>
              )}
            </div>
            {platform === "wordpress" ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Site-URL</Label>
                  <Input value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Gebruikersnaam</Label>
                  <Input value={username} onChange={(event) => setUsername(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Application password</Label>
                  <Input
                    type="password"
                    value={appPassword}
                    onChange={(event) => setAppPassword(event.target.value)}
                  />
                </div>
                <div className="sm:col-span-3 flex gap-2">
                  <Button disabled={pending === "wordpress"} onClick={() => void connectWordPress()}>
                    {pending === "wordpress" ? "Bezig…" : "Testen en verbinden"}
                  </Button>
                  {connected ? (
                    <Button variant="outline" onClick={() => void disconnect("wordpress")}>
                      Ontkoppelen
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
      <section className="rounded-2xl bg-muted/50 p-5">
        <h2 className="text-lg">Binnenkort</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {FUTURE_PLATFORMS.map((platform) => (
            <Button key={platform} variant="outline" onClick={() => void registerInterest(platform)}>
              {PLATFORM_LABELS[platform]} — houd me op de hoogte
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
