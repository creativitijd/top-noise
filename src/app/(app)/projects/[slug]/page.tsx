import { notFound, redirect } from "next/navigation";
import { PlannerDashboard } from "@/components/planner/planner-dashboard";
import { getAuth, getProjectBySlug } from "@/lib/auth/session";
import type { CalendarPost } from "@/lib/planner/style";
import type { Platform } from "@/lib/platforms";
import type { TargetStatus } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ProjectCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const auth = await getAuth();
  if (!auth) {
    redirect("/login");
  }
  const { slug } = await params;
  const { filter } = await searchParams;
  const project = await getProjectBySlug(auth.supabase, slug);
  if (!project) {
    notFound();
  }

  const [{ data: posts }, { data: channels }] = await Promise.all([
    auth.supabase.from("posts").select("*").eq("project_id", project.id).order("scheduled_at", { ascending: true }),
    auth.supabase.from("channels").select("platform, status").eq("project_id", project.id),
  ]);

  const postIds = (posts ?? []).map((post) => post.id);
  let targets: { post_id: string; platform: Platform; status: TargetStatus }[] = [];
  let media: { post_id: string | null; public_url: string }[] = [];

  if (postIds.length > 0) {
    const [targetResult, mediaResult] = await Promise.all([
      auth.supabase.from("post_targets").select("post_id, platform, status").in("post_id", postIds),
      auth.supabase.from("media").select("post_id, public_url").in("post_id", postIds),
    ]);
    targets = targetResult.data ?? [];
    media = mediaResult.data ?? [];
  }

  const calendarPosts: CalendarPost[] = (posts ?? []).map((post) => ({
    ...post,
    post_targets: targets
      .filter((target) => target.post_id === post.id)
      .map(({ platform, status }) => ({ platform, status })),
    media: media.filter((item) => item.post_id === post.id).map(({ public_url }) => ({ public_url })),
  }));

  return (
    <PlannerDashboard
      projectId={project.id}
      projectSlug={project.slug}
      posts={calendarPosts}
      channels={channels ?? []}
      filter={filter ?? null}
      country={project.country}
      region={project.region}
    />
  );
}
