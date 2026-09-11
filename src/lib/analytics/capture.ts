import { createAdminSupabase } from "@/lib/supabase/admin";
import { getPublisher } from "@/lib/publishers";
import { asRecord } from "@/lib/publishers/types";
import type { PostTarget } from "@/types/database";

export async function captureAnalytics(): Promise<{ captured: number }> {
  const admin = createAdminSupabase();
  const { data: targets, error } = await admin
    .from("post_targets")
    .select("*")
    .eq("status", "published")
    .not("remote_id", "is", null);
  if (error) {
    throw new Error(error.message);
  }
  if (!targets || targets.length === 0) {
    return { captured: 0 };
  }

  let captured = 0;
  for (const target of targets) {
    const ok = await captureTarget(target);
    if (ok) {
      captured += 1;
    }
  }
  return { captured };
}

async function captureTarget(target: PostTarget): Promise<boolean> {
  if (!target.remote_id) {
    return false;
  }
  const admin = createAdminSupabase();
  const { data: post } = await admin.from("posts").select("*").eq("id", target.post_id).single();
  if (!post) {
    return false;
  }
  const { data: channel } = await admin
    .from("channels")
    .select("*")
    .eq("project_id", post.project_id)
    .eq("platform", target.platform)
    .maybeSingle();
  if (!channel?.access_token) {
    return false;
  }

  const metrics = await getPublisher(target.platform).fetchAnalytics({
    remoteId: target.remote_id,
    accessToken: channel.access_token,
    meta: asRecord(channel.meta),
  });

  const { error } = await admin.from("analytics_snapshots").insert({
    post_target_id: target.id,
    impressions: metrics.impressions,
    likes: metrics.likes,
    comments: metrics.comments,
    shares: metrics.shares,
    clicks: metrics.clicks,
    raw: metrics.raw as import("@/types/database").Json,
  });
  return !error;
}
