import { format, subDays } from "date-fns";
import { googleJson } from "@/lib/google/oauth";
import type { SnapshotCandidate } from "@/lib/google/types";
import type { Json } from "@/types/database";

export type Ga4Snapshot = {
  propertyId: string;
  propertyName: string;
  sessions: number;
  socialShare: number;
  channels: Array<{ name: string; sessions: number }>;
  pages: Array<{ path: string; sessions: number; conversions: number }>;
};

export type GscSnapshot = {
  siteUrl: string;
  clicks: number;
  impressions: number;
  queries: Array<{ query: string; clicks: number; impressions: number }>;
  pages: Array<{ page: string; clicks: number; impressions: number }>;
};

export async function listGa4Properties(accessToken: string): Promise<SnapshotCandidate[]> {
  const data = await googleJson<{
    accountSummaries?: Array<{
      displayName?: string;
      propertySummaries?: Array<{ property?: string; displayName?: string }>;
    }>;
  }>("https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200", accessToken);

  return (data.accountSummaries ?? []).flatMap((account) =>
    (account.propertySummaries ?? []).map((property) => {
      const id = (property.property ?? "").replace(/^properties\//, "");
      return {
        id,
        name: [account.displayName, property.displayName].filter(Boolean).join(" / ") || id,
      };
    })
  );
}

export async function listGscSites(accessToken: string): Promise<SnapshotCandidate[]> {
  const data = await googleJson<{
    siteEntry?: Array<{ siteUrl?: string; permissionLevel?: string }>;
  }>("https://www.googleapis.com/webmasters/v3/sites", accessToken);

  return (data.siteEntry ?? [])
    .filter((site) => {
      const level = site.permissionLevel ?? "";
      return level === "siteOwner" || level === "siteFullUser" || level === "siteRestrictedUser";
    })
    .map((site) => ({
      id: site.siteUrl ?? "",
      name: site.siteUrl ?? "",
    }))
    .filter((site) => site.id);
}

export async function fetchGa4Snapshot(
  accessToken: string,
  propertyId: string,
  propertyName: string
): Promise<Ga4Snapshot> {
  const id = propertyId.replace(/^properties\//, "");
  const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${id}:runReport`;
  const range = { startDate: "90daysAgo", endDate: "yesterday" };

  const [channels, pages] = await Promise.all([
    runGa4Report(endpoint, accessToken, {
      dateRanges: [range],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: "12",
    }),
    runGa4Report(endpoint, accessToken, {
      dateRanges: [range],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "sessions" }, { name: "conversions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: "12",
    }).catch(() =>
      runGa4Report(endpoint, accessToken, {
        dateRanges: [range],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: "12",
      })
    ),
  ]);

  const channelRows = channels.rows.map((row) => ({
    name: row.dimensionValues[0] ?? "Onbekend",
    sessions: Number(row.metricValues[0] ?? 0),
  }));
  const sessions = channelRows.reduce((sum, row) => sum + row.sessions, 0);
  const social = channelRows
    .filter((row) => /social/i.test(row.name))
    .reduce((sum, row) => sum + row.sessions, 0);

  return {
    propertyId: id,
    propertyName,
    sessions,
    socialShare: sessions > 0 ? Math.round((social / sessions) * 1000) / 10 : 0,
    channels: channelRows,
    pages: pages.rows.map((row) => ({
      path: row.dimensionValues[0] ?? "/",
      sessions: Number(row.metricValues[0] ?? 0),
      conversions: Number(row.metricValues[1] ?? 0),
    })),
  };
}

export async function fetchGscSnapshot(accessToken: string, siteUrl: string): Promise<GscSnapshot> {
  const end = subDays(new Date(), 3);
  const start = subDays(end, 90);
  const startDate = format(start, "yyyy-MM-dd");
  const endDate = format(end, "yyyy-MM-dd");
  const encoded = encodeURIComponent(siteUrl);
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`;

  const [queries, pages] = await Promise.all([
    googleJson<{
      rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number }>;
    }>(endpoint, accessToken, {
      method: "POST",
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: 15,
      }),
    }),
    googleJson<{
      rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number }>;
    }>(endpoint, accessToken, {
      method: "POST",
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["page"],
        rowLimit: 15,
      }),
    }),
  ]);

  const queryRows = (queries.rows ?? []).map((row) => ({
    query: row.keys?.[0] ?? "",
    clicks: Math.round(row.clicks ?? 0),
    impressions: Math.round(row.impressions ?? 0),
  }));
  const pageRows = (pages.rows ?? []).map((row) => ({
    page: row.keys?.[0] ?? "",
    clicks: Math.round(row.clicks ?? 0),
    impressions: Math.round(row.impressions ?? 0),
  }));

  return {
    siteUrl,
    clicks: queryRows.reduce((sum, row) => sum + row.clicks, 0),
    impressions: queryRows.reduce((sum, row) => sum + row.impressions, 0),
    queries: queryRows,
    pages: pageRows,
  };
}

export function formatDataSnapshotText(input: {
  brand?: string | null;
  ga4?: Ga4Snapshot | null;
  gsc?: GscSnapshot | null;
}): string {
  const parts: string[] = [];
  if (input.ga4) {
    parts.push(
      [
        `GA4 (90 dagen, geverifieerd) — ${input.ga4.propertyName}:`,
        `Sessies: ${input.ga4.sessions}. Aandeel social: ${input.ga4.socialShare}%.`,
        input.ga4.channels.length
          ? `Kanalen: ${input.ga4.channels
              .slice(0, 8)
              .map((row) => `${row.name} ${row.sessions}`)
              .join("; ")}`
          : null,
        input.ga4.pages.length
          ? `Top pagina's: ${input.ga4.pages
              .slice(0, 8)
              .map((row) => `${row.path} (${row.sessions} sessies${row.conversions ? `, ${row.conversions} conv.` : ""})`)
              .join("; ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    );
  }
  if (input.gsc) {
    parts.push(
      [
        `Search Console (90 dagen, geverifieerd) — ${input.gsc.siteUrl}:`,
        `Klikken: ${input.gsc.clicks}. Vertoningen: ${input.gsc.impressions}.`,
        input.gsc.queries.length
          ? `Top zoektermen: ${input.gsc.queries
              .slice(0, 10)
              .map((row) => `${row.query} (${row.clicks} klikken)`)
              .join("; ")}`
          : null,
        input.gsc.pages.length
          ? `Pagina's die scoren: ${input.gsc.pages
              .slice(0, 8)
              .map((row) => `${row.page} (${row.clicks} klikken)`)
              .join("; ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    );
  }
  if (parts.length === 0) {
    return "";
  }
  return parts.join("\n\n");
}

export function snapshotToJson(value: Ga4Snapshot | GscSnapshot): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

async function runGa4Report(
  endpoint: string,
  accessToken: string,
  body: Record<string, unknown>
): Promise<{ rows: Array<{ dimensionValues: string[]; metricValues: string[] }> }> {
  const data = await googleJson<{
    rows?: Array<{
      dimensionValues?: Array<{ value?: string }>;
      metricValues?: Array<{ value?: string }>;
    }>;
  }>(endpoint, accessToken, { method: "POST", body: JSON.stringify(body) });

  return {
    rows: (data.rows ?? []).map((row) => ({
      dimensionValues: (row.dimensionValues ?? []).map((item) => item.value ?? ""),
      metricValues: (row.metricValues ?? []).map((item) => item.value ?? "0"),
    })),
  };
}
