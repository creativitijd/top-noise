import { notFound, redirect } from "next/navigation";
import { BrandSettingsForm } from "@/components/projects/brand-settings-form";
import { getAuth, getProjectBySlug } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
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
  const { data: pillars } = await auth.supabase
    .from("content_pillars")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at");

  return (
    <main className="min-w-0 space-y-4">
      <BrandSettingsForm project={project} pillars={pillars ?? []} />
    </main>
  );
}
