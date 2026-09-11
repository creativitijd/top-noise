import { notFound, redirect } from "next/navigation";
import { getAuth, getProjectBySlug } from "@/lib/auth/session";
import { PLATFORM_LABELS, type Platform } from "@/lib/platforms";
import type { AnalyticsSnapshot, PostTarget } from "@/types/database";

export const dynamic = "force-dynamic";

type TargetWithPost = PostTarget & {
  posts: { topic: string; scheduled_at: string } | null;
};

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const auth = await getAuth();
  if (!auth) {
    redirect("/login");
  }
  const { slug } = await params;
  const project = await getProjectBySlug(auth.supabase, slug);
  if (!project) {
    notFound();
  }

  const { data: posts } = await auth.supabase
    .from("posts")
    .select("id, topic, scheduled_at")
    .eq("project_id", project.id)
    .order("scheduled_at", { ascending: false });

  const postIds = (posts ?? []).map((post) => post.id);
  const { data: rawTargets } =
    postIds.length > 0
      ? await auth.supabase.from("post_targets").select("*").in("post_id", postIds)
      : { data: [] as PostTarget[] };

  const postMap = new Map((posts ?? []).map((post) => [post.id, post]));
  const targets = (rawTargets ?? []).map((target) => ({
    ...target,
    posts: postMap.get(target.post_id)
      ? {
          topic: postMap.get(target.post_id)!.topic,
          scheduled_at: postMap.get(target.post_id)!.scheduled_at,
        }
      : null,
  })) as TargetWithPost[];

  const targetIds = targets.map((target) => target.id);
  const { data: snapshots } =
    targetIds.length > 0
      ? await auth.supabase
          .from("analytics_snapshots")
          .select("*")
          .in("post_target_id", targetIds)
          .order("captured_at", { ascending: false })
      : { data: [] as AnalyticsSnapshot[] };

  const latest = new Map<string, AnalyticsSnapshot>();
  for (const snapshot of snapshots ?? []) {
    if (!latest.has(snapshot.post_target_id)) {
      latest.set(snapshot.post_target_id, snapshot);
    }
  }

  const totals = Array.from(latest.values()).reduce(
    (acc, snapshot) => ({
      impressions: acc.impressions + snapshot.impressions,
      likes: acc.likes + snapshot.likes,
      comments: acc.comments + snapshot.comments,
      shares: acc.shares + snapshot.shares,
    }),
    { impressions: 0, likes: 0, comments: 0, shares: 0 }
  );

  const perPlatform = new Map<Platform, typeof totals>();
  for (const target of targets) {
    const snapshot = latest.get(target.id);
    if (!snapshot) {
      continue;
    }
    const current = perPlatform.get(target.platform) ?? {
      impressions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };
    perPlatform.set(target.platform, {
      impressions: current.impressions + snapshot.impressions,
      likes: current.likes + snapshot.likes,
      comments: current.comments + snapshot.comments,
      shares: current.shares + snapshot.shares,
    });
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Weergaven" value={totals.impressions} />
        <Metric label="Likes" value={totals.likes} />
        <Metric label="Reacties" value={totals.comments} />
        <Metric label="Shares" value={totals.shares} />
      </section>
      <section className="grid gap-3 md:grid-cols-2">
        {Array.from(perPlatform.entries()).map(([platform, metrics]) => (
          <div key={platform} className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
            <h2 className="text-lg">{PLATFORM_LABELS[platform]}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {metrics.impressions} weergaven · {metrics.likes} likes · {metrics.comments} reacties
            </p>
          </div>
        ))}
      </section>
      <section className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Bericht</th>
              <th className="px-4 py-3 font-medium">Kanaal</th>
              <th className="px-4 py-3 font-medium">Weergaven</th>
              <th className="px-4 py-3 font-medium">Likes</th>
              <th className="px-4 py-3 font-medium">Reacties</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => {
              const snapshot = latest.get(target.id);
              return (
                <tr key={target.id} className="border-t">
                  <td className="px-4 py-3">{target.posts?.topic ?? "—"}</td>
                  <td className="px-4 py-3">{PLATFORM_LABELS[target.platform]}</td>
                  <td className="px-4 py-3">{snapshot?.impressions ?? 0}</td>
                  <td className="px-4 py-3">{snapshot?.likes ?? 0}</td>
                  <td className="px-4 py-3">{snapshot?.comments ?? 0}</td>
                </tr>
              );
            })}
            {targets.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-muted-foreground" colSpan={5}>
                  Nog geen gepubliceerde berichten om te meten.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-3xl">{value}</p>
    </div>
  );
}
