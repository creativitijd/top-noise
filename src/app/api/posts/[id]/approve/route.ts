import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth/session";
import { enqueuePublishJobs, processDueJobs } from "@/lib/jobs/process";
import { jsonError } from "@/lib/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await getAuth();
  if (!auth) {
    return jsonError("Niet ingelogd.", 401);
  }
  const { id } = await context.params;
  const immediate = new URL(request.url).searchParams.get("now") === "1";

  const { data: post, error } = await auth.supabase.from("posts").select("*").eq("id", id).single();
  if (error || !post) {
    return jsonError("Bericht niet gevonden.", 404);
  }
  if (!["draft", "rejected", "failed", "approved"].includes(post.status)) {
    return jsonError("Dit bericht kan nu niet goedgekeurd worden.");
  }

  const { data: targets } = await auth.supabase.from("post_targets").select("*").eq("post_id", id);
  if (!targets || targets.length === 0) {
    return jsonError("Geen platformen gekoppeld aan dit bericht.");
  }

  const empty = targets.filter((target) => target.content.trim().length === 0);
  if (empty.length > 0) {
    return jsonError("Vul eerst de tekst voor elk platform in.");
  }

  const scheduledFor = immediate ? new Date().toISOString() : post.scheduled_at;

  await auth.supabase.from("posts").update({ status: "scheduled" }).eq("id", id);
  await auth.supabase
    .from("post_targets")
    .update({ status: "ready", last_error: null })
    .eq("post_id", id);

  await enqueuePublishJobs({ targets, scheduledFor });

  if (immediate || new Date(scheduledFor).getTime() <= Date.now()) {
    await processDueJobs(targets.length + 2);
  }

  return NextResponse.json({ ok: true, scheduledFor });
}
