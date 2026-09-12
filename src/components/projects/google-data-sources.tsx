"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BarChart3, Loader2, Search } from "lucide-react";
import type { DataSourcePublic } from "@/lib/google/types";
import { cn } from "@/lib/utils";

type Payload = {
  configured?: boolean;
  ga4?: DataSourcePublic;
  gsc?: DataSourcePublic;
  error?: string;
};

export function GoogleDataSources({
  projectId,
  projectSlug,
  compact = false,
  returnPath,
}: {
  projectId: string;
  projectSlug: string;
  compact?: boolean;
  returnPath?: string;
}) {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const returnTo = returnPath ?? `/projects/${projectSlug}/settings`;

  async function load() {
    const response = await fetch(`/api/data-sources?projectId=${projectId}`);
    const body = (await response.json()) as Payload;
    if (!response.ok) {
      throw new Error(body.error ?? "Databronnen laden mislukt.");
    }
    setPayload(body);
  }

  useEffect(() => {
    void load().catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Databronnen laden mislukt.");
    });
  }, [projectId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("google");
    if (!status) {
      return;
    }
    if (status === "connected") {
      toast.success(
        params.get("pick") === "1"
          ? "Google gekoppeld. Kies hieronder welke property of site we gebruiken."
          : "Google gekoppeld. Snapshot van 90 dagen is binnengehaald."
      );
    } else if (status === "error") {
      toast.error(params.get("reason") ?? "Google-koppeling mislukt.");
    }
    router.replace(returnTo, { scroll: false });
  }, [returnTo, router]);

  async function act(provider: "ga4" | "gsc", action: "select" | "refresh" | "disconnect", externalId?: string) {
    setPending(`${provider}-${action}`);
    try {
      const response = await fetch("/api/data-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, provider, action, externalId }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Actie mislukt.");
      }
      await load();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Actie mislukt.");
    } finally {
      setPending(null);
    }
  }

  function connect(provider: "ga4" | "gsc") {
    window.location.href = `/api/oauth/google?projectId=${projectId}&provider=${provider}&returnTo=${encodeURIComponent(returnTo)}`;
  }

  if (!payload) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#8b8079]">
        <Loader2 className="size-4 animate-spin" />
        Databronnen laden…
      </div>
    );
  }

  if (!payload.configured) {
    return (
      <p className="text-sm text-[#635a52]">
        Google is op de server nog niet ingesteld. Zet <code>GOOGLE_CLIENT_ID</code> en{" "}
        <code>GOOGLE_CLIENT_SECRET</code> in de omgeving, met het OAuth-consent-scherm op{" "}
        <strong>In production</strong> (niet Testing — anders verloopt de koppeling na 7 dagen).
      </p>
    );
  }

  return (
    <div className={cn("grid gap-3", compact ? "" : "sm:grid-cols-2")}>
      <SourceCard
        title="Google Analytics"
        icon={<BarChart3 className="size-4" />}
        source={payload.ga4}
        pending={pending}
        onConnect={() => connect("ga4")}
        onSelect={(id) => void act("ga4", "select", id)}
        onRefresh={() => void act("ga4", "refresh")}
        onDisconnect={() => void act("ga4", "disconnect")}
      />
      <SourceCard
        title="Search Console"
        icon={<Search className="size-4" />}
        source={payload.gsc}
        pending={pending}
        onConnect={() => connect("gsc")}
        onSelect={(id) => void act("gsc", "select", id)}
        onRefresh={() => void act("gsc", "refresh")}
        onDisconnect={() => void act("gsc", "disconnect")}
      />
    </div>
  );
}

function SourceCard({
  title,
  icon,
  source,
  pending,
  onConnect,
  onSelect,
  onRefresh,
  onDisconnect,
}: {
  title: string;
  icon: React.ReactNode;
  source?: DataSourcePublic;
  pending: string | null;
  onConnect: () => void;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  onDisconnect: () => void;
}) {
  const connected = source?.status === "connected" && Boolean(source.externalId);
  const needsPick = source?.status === "connected" && !source.externalId && (source.candidates?.length ?? 0) > 0;
  const busy = pending?.startsWith(`${source?.provider ?? "x"}-`);

  return (
    <div className="rounded-[18px] border border-[rgb(31_27_24_/_8%)] bg-[#fafaf9] px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
            {icon}
            {title}
          </p>
          <p className="mt-1 text-[12.5px] text-[#635a52]">
            {connected
              ? `${source?.accountLabel ?? "Gekoppeld"}${source?.snapshotAt ? ` · snapshot ${source.snapshotAt.slice(0, 10)}` : ""}`
              : needsPick
                ? "Kies welke property of site we mogen lezen."
                : source?.status === "expired"
                  ? "Koppeling verlopen. Verbind opnieuw."
                  : "Nog niet gekoppeld. Alleen lezen, 90 dagen."}
          </p>
          {source?.lastError ? <p className="mt-1 text-[12.5px] text-[#b8562c]">{source.lastError}</p> : null}
        </div>
      </div>
      {needsPick ? (
        <select
          className="mt-3 h-10 w-full rounded-2xl border border-[rgb(31_27_24_/_14%)] bg-white px-3 text-sm"
          defaultValue=""
          disabled={busy}
          onChange={(event) => {
            if (event.target.value) {
              onSelect(event.target.value);
            }
          }}
        >
          <option value="">Kies…</option>
          {(source?.candidates ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {connected ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={onRefresh}
              className="rounded-full border border-[rgb(31_27_24_/_14%)] bg-white px-3 py-1.5 text-[13px] font-semibold disabled:opacity-50"
            >
              Snapshot verversen
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onDisconnect}
              className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-[#635a52] disabled:opacity-50"
            >
              Ontkoppelen
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={onConnect}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1f1b18] px-3.5 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Koppelen
          </button>
        )}
      </div>
    </div>
  );
}
