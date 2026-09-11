import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { AppShell, ProjectSidebar } from "@/components/layout/app-shell";
import { getAuth, getProjectBySlug } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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

  const [{ data: projects }, { data: posts }] = await Promise.all([
    auth.supabase.from("projects").select("name, slug, industry").order("updated_at", { ascending: false }),
    auth.supabase.from("posts").select("status").eq("project_id", project.id),
  ]);

  const counts = {
    draft: (posts ?? []).filter((post) => post.status === "draft" || post.status === "rejected").length,
    scheduled: (posts ?? []).filter(
      (post) => post.status === "scheduled" || post.status === "publishing" || post.status === "approved"
    ).length,
    published: (posts ?? []).filter((post) => post.status === "published").length,
  };

  return (
    <AppShell
      sidebar={
        <Suspense fallback={<aside className="min-h-[calc(100vh-44px)] rounded-3xl bg-[#1f1b18]" />}>
          <ProjectSidebar project={project} projects={projects ?? []} counts={counts} />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
