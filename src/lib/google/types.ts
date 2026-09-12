export type SnapshotCandidate = { id: string; name: string };

export type DataSourcePublic = {
  provider: "ga4" | "gsc";
  status: "disconnected" | "connected" | "expired" | "error";
  accountLabel: string | null;
  externalId: string | null;
  snapshotAt: string | null;
  lastError: string | null;
  candidates: SnapshotCandidate[];
};
