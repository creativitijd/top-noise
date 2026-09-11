import { createAdminSupabase } from "@/lib/supabase/admin";
import { getPublisher } from "@/lib/publishers";
import { asRecord } from "@/lib/publishers/types";
import type { Platform } from "@/lib/platforms";
import type { Channel, Media, Post, PostTarget, PublishJob } from "@/types/database";

function imageUrlsFor(media: Media[], platform: Platform): string[] {
  return media
    .filter((item) => !item.platform || item.platform === platform)
    .map((item) => item.public_url);
}

export async function enqueuePublishJobs(input: {
  targets: PostTarget[];
  scheduledFor: string;
}): Promise<void> {
  const admin = createAdminSupabase();
  const rows = input.targets.map((target) => ({
    post_target_id: target.id,
    scheduled_for: input.scheduledFor,
    idempotency_key: `${target.id}:${input.scheduledFor}`,
    status: "pending" as const,
  }));

  const { error } = await admin.from("publish_jobs").upsert(rows, {
    onConflict: "idempotency_key",
    ignoreDuplicates: true,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function processDueJobs(batchSize = 10): Promise<{ processed: number; failed: number }> {
  const admin = createAdminSupabase();
  const { data: jobs, error } = await admin.rpc("claim_publish_jobs", { batch_size: batchSize });
  if (error) {
    throw new Error(error.message);
  }
  if (!jobs || jobs.length === 0) {
    return { processed: 0, failed: 0 };
  }

  let failed = 0;
  for (const job of jobs) {
    const ok = await processJob(job);
    if (!ok) {
      failed += 1;
    }
  }
  return { processed: jobs.length, failed };
}

async function processJob(job: PublishJob): Promise<boolean> {
  const admin = createAdminSupabase();
  const { data: target, error: targetError } = await admin
    .from("post_targets")
    .select("*")
    .eq("id", job.post_target_id)
    .single();
  if (targetError || !target) {
    await failJob(job.id, targetError?.message ?? "Doelplatform niet gevonden.");
    return false;
  }

  const { data: post, error: postError } = await admin
    .from("posts")
    .select("*")
    .eq("id", target.post_id)
    .single();
  if (postError || !post) {
    await failJob(job.id, postError?.message ?? "Bericht niet gevonden.");
    return false;
  }

  const { data: channel } = await admin
    .from("channels")
    .select("*")
    .eq("project_id", post.project_id)
    .eq("platform", target.platform)
    .maybeSingle();

  const { data: media } = await admin.from("media").select("*").eq("post_id", post.id);

  await admin.from("post_targets").update({ status: "publishing" }).eq("id", target.id);
  await admin.from("posts").update({ status: "publishing" }).eq("id", post.id);

  const result = await publishTarget({
    post,
    target,
    channel: channel ?? null,
    media: media ?? [],
  });

  if (result.success) {
    await admin
      .from("post_targets")
      .update({
        status: "published",
        remote_id: result.remoteId ?? null,
        last_error: null,
        published_at: new Date().toISOString(),
      })
      .eq("id", target.id);
    await admin
      .from("publish_jobs")
      .update({ status: "succeeded", last_error: null })
      .eq("id", job.id);
  } else {
    await admin
      .from("post_targets")
      .update({ status: "failed", last_error: result.error ?? "Publiceren mislukt." })
      .eq("id", target.id);
    await failJob(job.id, result.error ?? "Publiceren mislukt.");
  }

  await refreshPostStatus(post.id);
  return result.success;
}

async function publishTarget(input: {
  post: Post;
  target: PostTarget;
  channel: Channel | null;
  media: Media[];
}) {
  if (!input.channel || input.channel.status !== "connected" || !input.channel.access_token) {
    return { success: false, error: `${input.target.platform} is niet verbonden.` };
  }

  const publisher = getPublisher(input.target.platform);
  return publisher.publish({
    content: input.target.content,
    title: input.post.title,
    imageUrls: imageUrlsFor(input.media, input.target.platform),
    accessToken: input.channel.access_token,
    refreshToken: input.channel.refresh_token,
    meta: asRecord(input.channel.meta),
  });
}

async function failJob(jobId: string, message: string) {
  const admin = createAdminSupabase();
  await admin.from("publish_jobs").update({ status: "failed", last_error: message }).eq("id", jobId);
}

export async function refreshPostStatus(postId: string) {
  const admin = createAdminSupabase();
  const { data: targets } = await admin.from("post_targets").select("*").eq("post_id", postId);
  if (!targets || targets.length === 0) {
    return;
  }

  const published = targets.filter((t) => t.status === "published").length;
  const failed = targets.filter((t) => t.status === "failed").length;
  const publishing = targets.some((t) => t.status === "publishing");

  let status: Post["status"] = "scheduled";
  if (publishing) {
    status = "publishing";
  } else if (published === targets.length) {
    status = "published";
  } else if (published > 0) {
    status = "published";
  } else if (failed === targets.length) {
    status = "failed";
  }

  await admin.from("posts").update({ status }).eq("id", postId);
}
