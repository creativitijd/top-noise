import { notFound, redirect } from "next/navigation";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { getAuth, getProjectBySlug } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ProjectCalendarPage({
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
    .select("*")
    .eq("project_id", project.id)
    .order("scheduled_at", { ascending: true });

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <MonthCalendar projectId={project.id} projectSlug={project.slug} posts={posts ?? []} />
    </main>
  );
}
