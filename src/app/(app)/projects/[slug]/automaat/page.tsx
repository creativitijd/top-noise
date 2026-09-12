import { notFound, redirect } from "next/navigation";
import { AutomaatPage } from "@/components/automaat/automaat-page";
import { getAuth, getProjectBySlug } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ProjectAutomaatPage({
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
  const { data: channels } = await auth.supabase
    .from("channels")
    .select("platform, status")
    .eq("project_id", project.id);

  return (
    <AutomaatPage
      projectId={project.id}
      projectSlug={project.slug}
      connectedChannels={(channels ?? [])
        .filter((channel) => channel.status === "connected")
        .map((channel) => channel.platform)}
    />
  );
}
